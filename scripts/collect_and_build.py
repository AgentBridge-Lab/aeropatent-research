from __future__ import annotations

import concurrent.futures
import html
import json
import re
import textwrap
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]

TARGET_COUNTRIES = {
    "US": {"label_ko": "미국", "label_en": "United States", "office": "USPTO"},
    "EP": {"label_ko": "유럽", "label_en": "European Patent Office", "office": "EPO"},
    "JP": {"label_ko": "일본", "label_en": "Japan", "office": "JPO"},
    "CN": {"label_ko": "중국", "label_en": "China", "office": "CNIPA"},
    "KR": {"label_ko": "한국", "label_en": "Korea", "office": "KIPO/KIPRIS"},
}

TAXONOMY = {
    "launch_recovery": {
        "label_ko": "재사용 발사체/회수",
        "label_en": "Reusable launch vehicle and recovery",
        "keywords": [
            "reusable launch vehicle",
            "vertical landing",
            "sea landing",
            "booster recovery",
            "launch vehicle",
            "rocket recovery",
        ],
        "ui_color": "#e54b4b",
    },
    "satellite_thermal": {
        "label_ko": "위성 열제어/플랫폼",
        "label_en": "Satellite thermal control and platform",
        "keywords": [
            "spacecraft thermal control",
            "satellite radiator",
            "heat pipe",
            "thermal louver",
            "spacecraft platform",
        ],
        "ui_color": "#f4b942",
    },
    "space_comm": {
        "label_ko": "위성통신/LEO 네트워크",
        "label_en": "Satellite communications and LEO networks",
        "keywords": [
            "LEO satellite constellation",
            "satellite communication",
            "inter-satellite link",
            "edge computing satellite",
            "MIMO satellite",
        ],
        "ui_color": "#2ca58d",
    },
    "remote_sensing_payload": {
        "label_ko": "SAR/원격탐사 페이로드",
        "label_en": "SAR and remote-sensing payload",
        "keywords": [
            "synthetic aperture radar",
            "SAR imaging",
            "digital beamforming",
            "wide swath",
            "remote sensing",
        ],
        "ui_color": "#4d8cf5",
    },
    "gnc_rendezvous": {
        "label_ko": "GNC/랑데부/온오빗 서비스",
        "label_en": "GNC, rendezvous, docking, and on-orbit servicing",
        "keywords": [
            "rendezvous",
            "docking",
            "on-orbit servicing",
            "attitude control",
            "proximity operation",
            "debris removal",
        ],
        "ui_color": "#8b5cf6",
    },
    "materials_tps": {
        "label_ko": "우주재료/TPS/코팅",
        "label_en": "Space materials, TPS, and coatings",
        "keywords": [
            "thermal protection",
            "spacecraft coating",
            "radiation shielding",
            "ablative material",
            "ceramic coating",
            "rocket motor insulation",
        ],
        "ui_color": "#d65a9d",
    },
}


SEED_PATENTS = [
    {
        "publication_number": "US8678321B2",
        "field": "launch_recovery",
        "country": "US",
        "url": "https://patents.google.com/patent/US8678321B2/en",
        "seed_title": "Sea landing of space launch vehicles and associated systems and methods",
        "seed_note": "Reusable booster stage sea-platform landing and recovery.",
    },
    {
        "publication_number": "US10822122B2",
        "field": "launch_recovery",
        "country": "US",
        "url": "https://patents.google.com/patent/US10822122B2/en",
        "seed_title": "Vertical landing systems for space vehicles and associated methods",
        "seed_note": "Vertical landing by engaging suspended cable systems.",
    },
    {
        "publication_number": "EP4140898A1",
        "field": "launch_recovery",
        "country": "EP",
        "url": "https://patents.google.com/patent/EP4140898A1/en",
        "seed_title": "Landing apparatus for a reusable launch vehicle",
        "seed_note": "Reusable launch vehicle landing apparatus family.",
    },
    {
        "publication_number": "EP3650358A1",
        "field": "launch_recovery",
        "country": "EP",
        "url": "https://patents.google.com/patent/EP3650358A1/en",
        "seed_title": "Return to base space launch vehicles, systems and methods",
        "seed_note": "Return-to-base launch vehicle family with US/CN/EP status.",
    },
    {
        "publication_number": "KR20230029274A",
        "field": "launch_recovery",
        "country": "KR",
        "url": "https://patents.google.com/patent/KR20230029274A/en",
        "seed_title": "Landing apparatus for reusable launch vehicle",
        "seed_note": "Korean publication for reusable launch vehicle landing.",
    },
    {
        "publication_number": "CN107344631A",
        "field": "launch_recovery",
        "country": "CN",
        "url": "https://patents.google.com/patent/CN107344631A/en",
        "seed_title": "Rocket recovery device",
        "seed_note": "Funnel/platform rocket recovery device.",
    },
    {
        "publication_number": "CN104724297A",
        "field": "launch_recovery",
        "country": "CN",
        "url": "https://patents.google.com/patent/CN104724297A/en",
        "seed_title": "Anti-toppling system used during carrier rocket vertical descending recovery",
        "seed_note": "Landing platform and guided-vehicle anti-toppling system.",
    },
    {
        "publication_number": "JP7603675B2",
        "field": "launch_recovery",
        "country": "JP",
        "url": "https://patents.google.com/patent/JP7603675B2/en",
        "seed_title": "Hybrid propulsion systems for spacecraft",
        "seed_note": "Japanese publication around hybrid spacecraft propulsion.",
    },
    {
        "publication_number": "US9862507B2",
        "field": "satellite_thermal",
        "country": "US",
        "url": "https://patents.google.com/patent/US9862507B2/en",
        "seed_title": "CubeSat form factor thermal control louvers",
        "seed_note": "Thermal louver assembly for CubeSat form factor.",
    },
    {
        "publication_number": "US20160288926A1",
        "field": "satellite_thermal",
        "country": "US",
        "url": "https://patents.google.com/patent/US20160288926A1/en",
        "seed_title": "Satellite radiator panels with combined stiffener/heat pipe",
        "seed_note": "Passive thermal radiator panel strengthened by heat pipes.",
    },
    {
        "publication_number": "EP4424602A1",
        "field": "satellite_thermal",
        "country": "EP",
        "url": "https://patents.google.com/patent/EP4424602A1/en",
        "seed_title": "Thermal control systems and methods for spacecraft",
        "seed_note": "Flexible, conformable, RF-transmissive thermal control material.",
    },
    {
        "publication_number": "EP3877263B1",
        "field": "satellite_thermal",
        "country": "EP",
        "url": "https://patents.google.com/patent/EP3877263B1/en",
        "seed_title": "Satellite",
        "seed_note": "Distributed satellite subsystems with simpler thermal control.",
    },
    {
        "publication_number": "CN101769825B",
        "field": "satellite_thermal",
        "country": "CN",
        "url": "https://patents.google.com/patent/CN101769825B/en",
        "seed_title": "Tracking temperature control device for spacecraft vacuum thermal test",
        "seed_note": "Spacecraft vacuum thermal-test temperature tracking.",
    },
    {
        "publication_number": "CN109573107A",
        "field": "satellite_thermal",
        "country": "CN",
        "url": "https://patents.google.com/patent/CN109573107A/en",
        "seed_title": "Spacecraft pressure vessel fixed module",
        "seed_note": "Temperature-control component and structural module for spacecraft vessel.",
    },
    {
        "publication_number": "US20210276736A1",
        "field": "satellite_thermal",
        "country": "US",
        "url": "https://patents.google.com/patent/US20210276736A1/en",
        "seed_title": "Thermal management system for structures in space",
        "seed_note": "Low-emissivity surfaces and thermal management for space structures.",
    },
    {
        "publication_number": "WO2001081173A1",
        "field": "satellite_thermal",
        "country": "WO",
        "url": "https://patents.google.com/patent/WO2001081173A1/en",
        "seed_title": "Louvers for spacecraft thermal control",
        "seed_note": "Reference PCT family for satellite temperature control louvers.",
    },
    {
        "publication_number": "US10666352B2",
        "field": "space_comm",
        "country": "US",
        "url": "https://patents.google.com/patent/US10666352B2/en",
        "seed_title": "Satellite system comprising satellites in LEO and other orbits",
        "seed_note": "Routing between LEO and non-LEO satellites by latency/routing logic.",
    },
    {
        "publication_number": "US10348396B2",
        "field": "space_comm",
        "country": "US",
        "url": "https://patents.google.com/patent/US10348396B2/en",
        "seed_title": "Low earth orbit satellite constellation system for communications spectrum reuse",
        "seed_note": "Reusing GEO-allocated spectrum in LEO communications.",
    },
    {
        "publication_number": "EP4143990A2",
        "field": "space_comm",
        "country": "EP",
        "url": "https://patents.google.com/patent/EP4143990A2/en",
        "seed_title": "Edge computing in satellite connectivity environments",
        "seed_note": "Edge computing integration in satellite communications.",
    },
    {
        "publication_number": "EP3329612B1",
        "field": "space_comm",
        "country": "EP",
        "url": "https://patents.google.com/patent/EP3329612B1/en",
        "seed_title": "Flexible capacity satellite constellation",
        "seed_note": "Satellite constellation capacity allocation and flexibility.",
    },
    {
        "publication_number": "CN103957045A",
        "field": "space_comm",
        "country": "CN",
        "url": "https://patents.google.com/patent/CN103957045A/en",
        "seed_title": "GEO-LEO satellite network for global information distribution",
        "seed_note": "GEO/LEO two-layer satellite network for information distribution.",
    },
    {
        "publication_number": "CN103687081B",
        "field": "space_comm",
        "country": "CN",
        "url": "https://patents.google.com/patent/CN103687081B/en",
        "seed_title": "Adaptive networking method suitable for small satellite clusters",
        "seed_note": "Centralized/distributed resource allocation and routing for small satellite clusters.",
    },
    {
        "publication_number": "KR20240127357A",
        "field": "space_comm",
        "country": "KR",
        "url": "https://patents.google.com/patent/KR20240127357A/en",
        "seed_title": "Distributed multi-input multi-output low earth orbit satellite system",
        "seed_note": "Distributed massive MIMO for LEO satellite clusters.",
    },
    {
        "publication_number": "JP2013540639A",
        "field": "space_comm",
        "country": "JP",
        "url": "https://patents.google.com/patent/JP2013540639A/en",
        "seed_title": "Satellite system and method for global coverage",
        "seed_note": "Japanese publication from a global coverage satellite communications family.",
    },
    {
        "publication_number": "US11754703B2",
        "field": "remote_sensing_payload",
        "country": "US",
        "url": "https://patents.google.com/patent/US11754703B2/en",
        "seed_title": "Synthetic aperture radar imaging apparatus and methods",
        "seed_note": "SAR system with interrogation/self-imaging modes.",
    },
    {
        "publication_number": "US10871561B2",
        "field": "remote_sensing_payload",
        "country": "US",
        "url": "https://patents.google.com/patent/US10871561B2/en",
        "seed_title": "Apparatus and methods for synthetic aperture radar with digital beamforming",
        "seed_note": "Digital beamforming SAR receiver subsystem.",
    },
    {
        "publication_number": "EP1241487A1",
        "field": "remote_sensing_payload",
        "country": "EP",
        "url": "https://patents.google.com/patent/EP1241487A1/en",
        "seed_title": "Side-looking synthetic aperture radar system",
        "seed_note": "Transmit/receive aperture architecture for SAR.",
    },
    {
        "publication_number": "EP3432027B1",
        "field": "remote_sensing_payload",
        "country": "EP",
        "url": "https://patents.google.com/patent/EP3432027B1/en",
        "seed_title": "High resolution wide swath synthetic aperture radar system",
        "seed_note": "High-resolution wide-swath SAR system.",
    },
    {
        "publication_number": "CN102221696A",
        "field": "remote_sensing_payload",
        "country": "CN",
        "url": "https://patents.google.com/patent/CN102221696A/en",
        "seed_title": "Sparse microwave imaging method",
        "seed_note": "Sparse observation-data processing for SAR imaging.",
    },
    {
        "publication_number": "KR20240129160A",
        "field": "remote_sensing_payload",
        "country": "KR",
        "url": "https://patents.google.com/patent/KR20240129160A/en",
        "seed_title": "High-resolution wide swath SAR imaging",
        "seed_note": "Korean publication for high-resolution wide-swath SAR imaging.",
    },
    {
        "publication_number": "KR101920379B1",
        "field": "remote_sensing_payload",
        "country": "KR",
        "url": "https://patents.google.com/patent/KR101920379B1/en",
        "seed_title": "Bistatic synthetic aperture radar system based on global navigation satellite system",
        "seed_note": "GNSS-based bistatic SAR system.",
    },
    {
        "publication_number": "US20190023422A1",
        "field": "gnc_rendezvous",
        "country": "US",
        "url": "https://patents.google.com/patent/US20190023422A1/en",
        "seed_title": "Spacecraft servicing devices and related assemblies, systems, and methods",
        "seed_note": "Servicing pods deployed from host spacecraft to service target spacecraft.",
    },
    {
        "publication_number": "US6945500B2",
        "field": "gnc_rendezvous",
        "country": "US",
        "url": "https://patents.google.com/patent/US6945500B2/en",
        "seed_title": "Apparatus for a geosynchronous life extension spacecraft",
        "seed_note": "Satellite life-extension spacecraft with thruster pods and mechanical implement.",
    },
    {
        "publication_number": "US9302793B2",
        "field": "gnc_rendezvous",
        "country": "US",
        "url": "https://patents.google.com/patent/US9302793B2/en",
        "seed_title": "Spacecraft docking system",
        "seed_note": "Independent elongate members and force management for docking.",
    },
    {
        "publication_number": "EP3186151B1",
        "field": "gnc_rendezvous",
        "country": "EP",
        "url": "https://patents.google.com/patent/EP3186151B1/en",
        "seed_title": "Docking system and method for satellites",
        "seed_note": "Service satellite docking unit with foldable gripping arms.",
    },
    {
        "publication_number": "EP3932810B1",
        "field": "gnc_rendezvous",
        "country": "EP",
        "url": "https://patents.google.com/patent/EP3932810B1/en",
        "seed_title": "Flight control intelligent data analysis and decision support system for spacecraft rendezvous and docking",
        "seed_note": "Real-time flight-control data analysis for rendezvous and docking.",
    },
    {
        "publication_number": "CN106081171A",
        "field": "gnc_rendezvous",
        "country": "CN",
        "url": "https://patents.google.com/patent/CN106081171A/en",
        "seed_title": "Space-orbit trouble shooting operation ground simulating system",
        "seed_note": "Ground simulation for in-orbit approach/capture/service operations.",
    },
    {
        "publication_number": "CN107244432A",
        "field": "gnc_rendezvous",
        "country": "CN",
        "url": "https://patents.google.com/patent/CN107244432A/en",
        "seed_title": "Free base spatial cooperation mission ground verification system",
        "seed_note": "Free-base verification system for orbital cooperative missions.",
    },
    {
        "publication_number": "KR102412775B1",
        "field": "gnc_rendezvous",
        "country": "KR",
        "url": "https://patents.google.com/patent/KR102412775B1/en",
        "seed_title": "Satellite attitude control ground test simulation device",
        "seed_note": "Korean satellite attitude-control ground-test simulation device.",
    },
    {
        "publication_number": "JPH01282098A",
        "field": "gnc_rendezvous",
        "country": "JP",
        "url": "https://patents.google.com/patent/JPH01282098A/en",
        "seed_title": "Automated rendezvous and docking of spacecraft",
        "seed_note": "Older Japanese publication cited in autonomous rendezvous/docking prior art.",
    },
    {
        "publication_number": "US20240002672A1",
        "field": "materials_tps",
        "country": "US",
        "url": "https://patents.google.com/patent/US20240002672A1/en",
        "seed_title": "Spacecraft, coating and method",
        "seed_note": "2D-material coating for spacecraft/satellite outer surface.",
    },
    {
        "publication_number": "US10717836B1",
        "field": "materials_tps",
        "country": "US",
        "url": "https://patents.google.com/patent/US10717836B1/en",
        "seed_title": "Alternative resin systems for thermal protection materials",
        "seed_note": "Low-density thermal protective materials for spacecraft.",
    },
    {
        "publication_number": "US4713275A",
        "field": "materials_tps",
        "country": "US",
        "url": "https://patents.google.com/patent/US4713275A/en",
        "seed_title": "Ceramic/ceramic shell tile thermal protection system",
        "seed_note": "Reusable externally applied ceramic TPS.",
    },
    {
        "publication_number": "EP1493788A1",
        "field": "materials_tps",
        "country": "EP",
        "url": "https://patents.google.com/patent/EP1493788A1/en",
        "seed_title": "Silicone-cork ablative material",
        "seed_note": "Silicone-cork material for thermal protection systems.",
    },
    {
        "publication_number": "EP1373386A2",
        "field": "materials_tps",
        "country": "EP",
        "url": "https://patents.google.com/patent/EP1373386A2/en",
        "seed_title": "Fiber-reinforced rocket motor insulation",
        "seed_note": "Rocket motor insulation with vapor-grown carbon fibers.",
    },
    {
        "publication_number": "CN104561882A",
        "field": "materials_tps",
        "country": "CN",
        "url": "https://patents.google.com/patent/CN104561882A/en",
        "seed_title": "High-temperature oxidation resistant coating on niobium alloy",
        "seed_note": "High-temperature oxidation-resistant coating for rocket-space applications.",
    },
    {
        "publication_number": "CN101775219B",
        "field": "materials_tps",
        "country": "CN",
        "url": "https://patents.google.com/patent/CN101775219B/en",
        "seed_title": "Radiation-resistant addition type room temperature vulcanized liquid silicone rubber",
        "seed_note": "Radiation-resistant silicone rubber material.",
    },
    {
        "publication_number": "WO2011131694A1",
        "field": "materials_tps",
        "country": "WO",
        "url": "https://patents.google.com/patent/WO2011131694A1/en",
        "seed_title": "Thermal protection material",
        "seed_note": "PCT family for spatial-field thermal protection materials.",
    },
    {
        "publication_number": "JPH05193592A",
        "field": "satellite_thermal",
        "country": "JP",
        "url": "https://patents.google.com/patent/JPH05193592A/en",
        "seed_title": "Thermal control arrangements for a geosynchronous spacecraft",
        "seed_note": "Japanese family publication for geosynchronous spacecraft thermal control.",
    },
    {
        "publication_number": "JP6763875B2",
        "field": "satellite_thermal",
        "country": "JP",
        "url": "https://patents.google.com/patent/JP6763875B2/en",
        "seed_title": "Satellite radiator panels with combined stiffener/heat pipe",
        "seed_note": "Japanese family publication for satellite radiator/heat-pipe panel.",
    },
    {
        "publication_number": "KR102124242B1",
        "field": "satellite_thermal",
        "country": "KR",
        "url": "https://patents.google.com/patent/KR102124242B1/en",
        "seed_title": "Satellite radiator panels with combined stiffener/heat pipe",
        "seed_note": "Korean family publication for satellite radiator/heat-pipe panel.",
    },
    {
        "publication_number": "KR102742715B1",
        "field": "satellite_thermal",
        "country": "KR",
        "url": "https://patents.google.com/patent/KR102742715B1/en",
        "seed_title": "Thermal management system for structures in space",
        "seed_note": "Korean family publication for space-structure thermal management.",
    },
    {
        "publication_number": "CN107848635B",
        "field": "satellite_thermal",
        "country": "CN",
        "url": "https://patents.google.com/patent/CN107848635B/en",
        "seed_title": "Satellite radiator panels with combined stiffener/heat pipe",
        "seed_note": "Chinese family publication for satellite radiator/heat-pipe panel.",
    },
    {
        "publication_number": "JP6896982B2",
        "field": "space_comm",
        "country": "JP",
        "url": "https://patents.google.com/patent/JP6896982B2/en",
        "seed_title": "Low earth orbit satellite constellation system for communications spectrum reuse",
        "seed_note": "Japanese family publication for LEO communication spectrum reuse.",
    },
    {
        "publication_number": "KR102165365B1",
        "field": "space_comm",
        "country": "KR",
        "url": "https://patents.google.com/patent/KR102165365B1/en",
        "seed_title": "Low earth orbit satellite constellation system for communications spectrum reuse",
        "seed_note": "Korean family publication for LEO communication spectrum reuse.",
    },
    {
        "publication_number": "CN109417827B",
        "field": "space_comm",
        "country": "CN",
        "url": "https://patents.google.com/patent/CN109417827B/en",
        "seed_title": "Low earth orbit satellite constellation system for communications spectrum reuse",
        "seed_note": "Chinese family publication for LEO communication spectrum reuse.",
    },
    {
        "publication_number": "JP7582444B2",
        "field": "remote_sensing_payload",
        "country": "JP",
        "url": "https://patents.google.com/patent/JP7582444B2/en",
        "seed_title": "Change detection device and change detection method",
        "seed_note": "Japanese SAR-related change detection publication.",
        "seed_publication_date": "2024-11-13",
    },
    {
        "publication_number": "JPS62165582U",
        "field": "remote_sensing_payload",
        "country": "JP",
        "url": "https://patents.google.com/patent/JPS62165582U/en",
        "seed_title": "Three dimensional interferometric synthetic aperture radar",
        "seed_note": "Japanese utility-model style publication related to interferometric SAR.",
    },
    {
        "publication_number": "KR102876480B1",
        "field": "remote_sensing_payload",
        "country": "KR",
        "url": "https://patents.google.com/patent/KR102876480B1/en",
        "seed_title": "High resolution wide swath synthetic aperture radar system",
        "seed_note": "Korean family publication for high-resolution wide-swath SAR.",
    },
    {
        "publication_number": "JP6670837B2",
        "field": "gnc_rendezvous",
        "country": "JP",
        "url": "https://patents.google.com/patent/JP6670837B2/en",
        "seed_title": "Docking system and method for satellites",
        "seed_note": "Japanese family publication for service-satellite docking.",
    },
    {
        "publication_number": "CN107108047A",
        "field": "gnc_rendezvous",
        "country": "CN",
        "url": "https://patents.google.com/patent/CN107108047A/en",
        "seed_title": "Docking system and method for satellites",
        "seed_note": "Chinese family publication for service-satellite docking.",
    },
    {
        "publication_number": "JP2005014900A",
        "field": "materials_tps",
        "country": "JP",
        "url": "https://patents.google.com/patent/JP2005014900A/en",
        "seed_title": "Silicone-cork ablative material",
        "seed_note": "Japanese family publication for ablative thermal protection material.",
    },
    {
        "publication_number": "JP2003509279A",
        "field": "materials_tps",
        "country": "JP",
        "url": "https://patents.google.com/patent/JP2003509279A/en",
        "seed_title": "Elastomerized phenolic resin ablative insulation for rocket motors",
        "seed_note": "Japanese family publication for rocket-motor ablative insulation.",
    },
    {
        "publication_number": "KR101549952B1",
        "field": "materials_tps",
        "country": "KR",
        "url": "https://patents.google.com/patent/KR101549952B1/en",
        "seed_title": "Manufacturing method of the exit cone for propulsion nozzle unit",
        "seed_note": "Korean propulsion nozzle/exit-cone manufacturing publication relevant to thermal structural components.",
    },
    {
        "publication_number": "CN1641200A",
        "field": "materials_tps",
        "country": "CN",
        "url": "https://patents.google.com/patent/CN1641200A/en",
        "seed_title": "Elastomerized phenolic resin ablative insulation for rocket motors",
        "seed_note": "Chinese family publication for rocket-motor ablative insulation.",
    },
]


SOURCE_REGISTRY = {
    "generated_at": None,
    "collection_mode": "web_accessible_seed_corpus",
    "primary_source_used": {
        "name": "Google Patents pages via Jina Reader",
        "url": "https://patents.google.com/",
        "coverage_note": "Google Patents states it searches full text from patent offices around the world. This seed corpus uses individual Google Patents publication pages for bibliographic text, abstract snippets, and family hints.",
        "limitations": [
            "Not a legal source of record.",
            "Some translated pages and legal-status fields are assumptions.",
            "CSV/XHR bulk access was rate-limited during this run, so individual pages were fetched instead.",
        ],
    },
    "official_sources_for_production_refresh": [
        {
            "country": "US",
            "source": "USPTO Open Data Portal / Patent Public Search",
            "url": "https://data.uspto.gov/",
            "notes": "Use USPTO ODP APIs or Patent Public Search for source-of-record US data. ODP may require a USPTO.gov account/API key.",
        },
        {
            "country": "EP",
            "source": "EPO Open Patent Services (OPS)",
            "url": "https://www.epo.org/en/searching-for-patents/data/web-services/ops",
            "notes": "Use OPS for EPO bibliographic/family data. Registered credentials and fair-use handling are needed.",
        },
        {
            "country": "JP",
            "source": "J-PlatPat / Japan Patent Office",
            "url": "https://www.jpo.go.jp/e/support/j_platpat/patent_search.html",
            "notes": "J-PlatPat is the official digital library for Japanese patents and utility models.",
        },
        {
            "country": "CN",
            "source": "CNIPA Patent Search and Analysis System",
            "url": "https://pss-system.cponline.cnipa.gov.cn/conventionalSearchEn",
            "notes": "Use CNIPA public services for China source-of-record publication and legal data.",
        },
        {
            "country": "KR",
            "source": "KIPRIS Plus",
            "url": "https://plus.kipris.or.kr/eng/main.do",
            "notes": "Use KIPRIS Plus Open API with ServiceKey for Korean patent and utility-model data.",
        },
    ],
}


SEARCH_PROTOCOL = {
    "version": "2026-06-21",
    "goal": "항공우주 특허를 분야별, 국가별, 기간별로 비교하고 LLM Wiki 그래프 탐색에 연결한다.",
    "jurisdictions": ["US", "EP", "JP", "CN", "KR"],
    "fields": list(TAXONOMY.keys()),
    "query_templates": [
        '"{keyword}" patent country:{country}',
        '"{keyword}" site:patents.google.com/patent {country}',
        '"{keyword}" CPC:{cpc_hint} publication:{start_year}..{end_year}',
    ],
    "screening_rules": [
        "항공우주 시스템, 위성, 발사체, 우주환경, SAR/통신/온오빗 서비스 관련성이 명확한 문헌만 포함한다.",
        "동일 패밀리의 여러 공개번호는 UI 비교에는 남기되, 분석 리포트에서는 family_id 기준 중복을 표시한다.",
        "법적 상태와 권리 존속 판단은 Google Patents 추정값만으로 확정하지 않는다.",
        "생성 리포트는 기술지형/탐색용이며 FTO 또는 침해 판단으로 사용하지 않는다.",
    ],
    "production_refresh_order": [
        "1. 공식 API 키 확보: USPTO ODP, EPO OPS, KIPRIS Plus",
        "2. CNIPA/J-PlatPat는 export 가능 방식 또는 합법적 크롤링 정책 확인",
        "3. 키워드+CPC 검색으로 후보 수집",
        "4. 패밀리 단위 dedupe 및 국가별 공개번호 보존",
        "5. 초록/청구항/IPC/CPC/출원인/날짜/legal status 정규화",
        "6. LLM chunk와 graph node/edge 재생성",
    ],
}


def ensure_dirs() -> None:
    for rel in [
        "config",
        "raw/jina_pages",
        "raw/google_html",
        "raw/search_evidence",
        "normalized",
        "graph",
        "analysis",
        "reports",
    ]:
        (ROOT / rel).mkdir(parents=True, exist_ok=True)


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def jina_url(url: str) -> str:
    # This form is accepted by r.jina.ai for HTTPS source pages.
    return "https://r.jina.ai/http://" + url


def clean_text(value: str | None, max_len: int | None = None) -> str:
    if not value:
        return ""
    text = re.sub(r"\[[^\]]+\]\([^)]+\)", "", value)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    if max_len and len(text) > max_len:
        return text[: max_len - 1].rstrip() + "…"
    return text


def clean_html(value: str | None, max_len: int | None = None) -> str:
    if not value:
        return ""
    text = re.sub(r"<script.*?</script>", " ", value, flags=re.S | re.I)
    text = re.sub(r"<style.*?</style>", " ", value, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return clean_text(text, max_len)


def section(text: str, heading: str) -> str:
    pattern = rf"##\s+{re.escape(heading)}[^\n]*\n(?P<body>.*?)(?=\n##\s+|\n#\s+|\Z)"
    match = re.search(pattern, text, re.S | re.I)
    return match.group("body").strip() if match else ""


def fetch_one(seed: dict[str, Any]) -> dict[str, Any]:
    pub = seed["publication_number"]
    raw_path = ROOT / "raw" / "jina_pages" / f"{pub}.md"
    if raw_path.exists() and raw_path.stat().st_size > 1000:
        return {
            **seed,
            "fetched": True,
            "raw_format": "jina_markdown",
            "raw_path": str(raw_path),
            "raw_text": raw_path.read_text(encoding="utf-8", errors="ignore"),
        }

    request = urllib.request.Request(
        jina_url(seed["url"]),
        headers={
            "User-Agent": "AEROPATENT-ResearchBot/0.1 (+local research corpus)",
            "Accept": "text/markdown,text/plain,*/*",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=35) as response:
            body = response.read().decode("utf-8", errors="replace")
        raw_path.write_text(body, encoding="utf-8")
        time.sleep(0.2)
        return {
            **seed,
            "fetched": True,
            "raw_format": "jina_markdown",
            "raw_path": str(raw_path),
            "raw_text": body,
        }
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        html_path = ROOT / "raw" / "google_html" / f"{pub}.html"
        try:
            html_request = urllib.request.Request(
                seed["url"],
                headers={
                    "User-Agent": "Mozilla/5.0 AEROPATENT-ResearchBot/0.1",
                    "Accept": "text/html,application/xhtml+xml,*/*",
                },
            )
            with urllib.request.urlopen(html_request, timeout=35) as response:
                body = response.read().decode("utf-8", errors="replace")
            html_path.write_text(body, encoding="utf-8")
            time.sleep(0.2)
            return {
                **seed,
                "fetched": True,
                "raw_format": "google_html",
                "fetch_warning": f"Jina failed, direct HTML used: {exc}",
                "raw_path": str(html_path),
                "raw_text": body,
            }
        except (urllib.error.URLError, TimeoutError, OSError) as html_exc:
            fallback = f"# {seed['seed_title']}\n\nFetch failed for {seed['url']}: {exc}; html fallback failed: {html_exc}\n"
            raw_path.write_text(fallback, encoding="utf-8")
            return {
                **seed,
                "fetched": False,
                "fetch_error": f"{exc}; html fallback failed: {html_exc}",
                "raw_format": "fetch_error",
                "raw_path": str(raw_path),
                "raw_text": fallback,
            }


def parse_patent(seed: dict[str, Any]) -> dict[str, Any]:
    text = seed.get("raw_text", "")
    pub = seed["publication_number"]
    raw_format = seed.get("raw_format", "jina_markdown")

    title = seed.get("seed_title", pub)
    if raw_format == "google_html":
        m = re.search(r'<meta\s+name="DC\.title"\s+content="(.*?)"', text, re.S | re.I)
        if m:
            title = clean_html(m.group(1), 240)
        else:
            m = re.search(r"<title>(.*?)</title>", text, re.S | re.I)
            if m:
                title = re.sub(r"\s+-\s+Google Patents.*$", "", clean_html(m.group(1), 240))
    else:
        m = re.search(r"^Title:\s*(.+)$", text, re.M)
        if m:
            title = clean_text(m.group(1), 240)
        else:
            m = re.search(rf"##\s+{re.escape(pub)}\s+-\s+(.+?)\s+-\s+Google Patents", text, re.I)
            if m:
                title = clean_text(m.group(1), 240)

    abstract = ""
    if raw_format == "google_html":
        m = re.search(r'<section\s+itemprop="abstract".*?</section>', text, re.S | re.I)
        if m:
            abstract = clean_html(m.group(0), 1400)
            abstract = re.sub(r"^Abstract\s+", "", abstract, flags=re.I).strip()
    else:
        abstract = clean_text(section(text, "Abstract"), 1400)
    if not abstract:
        abstract = clean_text(seed.get("seed_note", ""), 800)

    claims_text = ""
    if raw_format == "google_html":
        m = re.search(r'<section\s+itemprop="claims".*?</section>', text, re.S | re.I)
        if m:
            claims_text = clean_html(m.group(0), 8000)
            claims_text = re.sub(r"^Claims[^\d]*", "", claims_text, flags=re.I).strip()
    else:
        claims_text = section(text, "Claims")
    first_claim = ""
    if claims_text:
        claim_match = re.search(r"(?:^|\n)\s*1\.\s+(.*?)(?=(?:\n\s*2\.\s+)|\Z)", claims_text, re.S)
        first_claim = clean_text(claim_match.group(1) if claim_match else claims_text, 1400)

    family_id = ""
    m = re.search(r"##\s+ID=(\d+)", text)
    if m:
        family_id = m.group(1)

    dates = {}
    for label, key in [
        ("Priority date", "priority_date"),
        ("Filing date", "filing_date"),
        ("Publication date", "publication_date"),
    ]:
        if raw_format == "google_html":
            prop = {
                "Priority date": "priorityDate",
                "Filing date": "filingDate",
                "Publication date": "publicationDate",
            }[label]
            m = re.search(rf'itemprop="{prop}"[^>]*datetime="(\d{{4}}-\d{{2}}-\d{{2}})"', text, re.S | re.I)
            if not m:
                m = re.search(rf'itemprop="{prop}"[^>]*>(\d{{4}}-\d{{2}}-\d{{2}})', text, re.S | re.I)
        else:
            m = re.search(label + r".{0,160}?(\d{4}-\d{2}-\d{2})", text, re.S)
        if m:
            dates[key] = m.group(1)
    for seed_key, out_key in [
        ("seed_priority_date", "priority_date"),
        ("seed_filing_date", "filing_date"),
        ("seed_publication_date", "publication_date"),
    ]:
        if not dates.get(out_key) and seed.get(seed_key):
            dates[out_key] = seed[seed_key]

    publication_year = None
    for key in ["publication_date", "filing_date", "priority_date"]:
        if key in dates:
            publication_year = int(dates[key][:4])
            break
    if not publication_year:
        m = re.search(r"(19|20)\d{2}", pub)
        publication_year = int(m.group(0)) if m else None

    assignee = ""
    if raw_format == "google_html":
        m = re.search(r'<dd\s+itemprop="assigneeCurrent"[^>]*>(.*?)</dd>', text, re.S | re.I)
        if m:
            assignee = clean_html(m.group(1), 160)
        if not assignee:
            m = re.search(r'<dd\s+itemprop="assigneeOriginal"[^>]*>(.*?)</dd>', text, re.S | re.I)
            if m:
                assignee = clean_html(m.group(1), 160)
    else:
        m = re.search(r"Current Assignee.*?\)(.*?)(?:Original Assignee|Priority date)", text, re.S)
        if m:
            assignee = clean_text(m.group(1), 160)
        if not assignee:
            m = re.search(r"Original Assignee\s+(.+?)(?:Priority date|Filing date)", text, re.S)
            if m:
                assignee = clean_text(m.group(1), 160)

    country_status = {}
    country_status_section = section(text, "Country Status")
    for cc, count in re.findall(r"\b(US|EP|JP|CN|KR)\s*\((\d+)\)", country_status_section):
        country_status[cc] = int(count)

    authority = seed.get("country") or pub[:2]
    if authority not in TARGET_COUNTRIES and authority != "WO":
        authority = pub[:2]

    field = seed["field"]
    terms = []
    lower = (title + " " + abstract + " " + first_claim + " " + seed.get("seed_note", "")).lower()
    for kw in TAXONOMY[field]["keywords"]:
        if kw.lower() in lower:
            terms.append(kw)
    if not terms:
        terms = TAXONOMY[field]["keywords"][:2]

    return {
        "id": f"patent:{pub}",
        "publication_number": pub,
        "authority": authority,
        "target_country": authority in TARGET_COUNTRIES,
        "field": field,
        "field_label_ko": TAXONOMY[field]["label_ko"],
        "title": title,
        "abstract": abstract,
        "first_claim_excerpt": first_claim,
        "assignee": assignee,
        "priority_date": dates.get("priority_date"),
        "filing_date": dates.get("filing_date"),
        "publication_date": dates.get("publication_date"),
        "publication_year": publication_year,
        "family_id": family_id,
        "family_country_status": country_status,
        "source_url": seed["url"],
        "raw_path": seed.get("raw_path"),
        "raw_format": raw_format,
        "fetched": seed.get("fetched", False),
        "fetch_error": seed.get("fetch_error"),
        "seed_note": seed.get("seed_note", ""),
        "matched_terms": terms,
        "llm_summary_ko": summarize_patent_ko(title, abstract, field, authority),
    }


def summarize_patent_ko(title: str, abstract: str, field: str, authority: str) -> str:
    country = TARGET_COUNTRIES.get(authority, {"label_ko": authority})["label_ko"]
    field_label = TAXONOMY[field]["label_ko"]
    basis = abstract if abstract else title
    basis = clean_text(basis, 220)
    return f"{country} {field_label} 후보 문헌. 핵심은 '{title}'이며, 근거 요약은 {basis}"


def make_chunks(patents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    chunks = []
    for patent in patents:
        pub = patent["publication_number"]
        base = {
            "patent_id": patent["id"],
            "publication_number": pub,
            "field": patent["field"],
            "authority": patent["authority"],
            "source_url": patent["source_url"],
        }
        if patent.get("abstract"):
            chunks.append(
                {
                    **base,
                    "id": f"chunk:{pub}:abstract",
                    "chunk_type": "abstract",
                    "text": patent["abstract"],
                    "llm_hint": "기술 문제, 해결수단, 적용 분야를 우선 추출",
                }
            )
        if patent.get("first_claim_excerpt"):
            chunks.append(
                {
                    **base,
                    "id": f"chunk:{pub}:claim1",
                    "chunk_type": "claim_excerpt",
                    "text": patent["first_claim_excerpt"],
                    "llm_hint": "권리범위 구성요소와 시스템 요소를 우선 추출",
                }
            )
        chunks.append(
            {
                **base,
                "id": f"chunk:{pub}:site_summary",
                "chunk_type": "site_summary",
                "text": patent["llm_summary_ko"],
                "llm_hint": "UI 카드와 그래프 tooltip에 사용",
            }
        )
    return chunks


def score_patent(patent: dict[str, Any]) -> float:
    score = 0.0
    year = patent.get("publication_year") or 2000
    if year >= 2024:
        score += 3
    elif year >= 2020:
        score += 2
    elif year >= 2015:
        score += 1
    if patent.get("first_claim_excerpt"):
        score += 1.5
    if patent.get("abstract"):
        score += 1.2
    score += min(len(patent.get("family_country_status") or {}), 5) * 0.4
    if patent.get("authority") in TARGET_COUNTRIES:
        score += 0.5
    return round(score, 2)


def make_graph(patents: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    nodes: dict[str, dict[str, Any]] = {}
    edges: list[dict[str, Any]] = []

    def add_node(node_id: str, kind: str, label: str, **extra: Any) -> None:
        if node_id not in nodes:
            nodes[node_id] = {"id": node_id, "type": kind, "label": label, **extra}

    for country, meta in TARGET_COUNTRIES.items():
        add_node(f"country:{country}", "country", meta["label_ko"], country=country, office=meta["office"], mass=10)
    for field, meta in TAXONOMY.items():
        add_node(f"field:{field}", "field", meta["label_ko"], field=field, color=meta["ui_color"], mass=12)
        for kw in meta["keywords"]:
            add_node(f"tech:{slug(kw)}", "technology", kw, field=field, mass=4)
            edges.append(
                {
                    "id": f"edge:field:{field}:tech:{slug(kw)}",
                    "source": f"field:{field}",
                    "target": f"tech:{slug(kw)}",
                    "type": "FIELD_KEYWORD",
                    "weight": 1,
                }
            )

    for patent in patents:
        pub = patent["publication_number"]
        pnode = patent["id"]
        add_node(
            pnode,
            "patent",
            pub,
            title=patent["title"],
            field=patent["field"],
            country=patent["authority"],
            year=patent.get("publication_year"),
            score=score_patent(patent),
            source_url=patent["source_url"],
            mass=3 + score_patent(patent),
        )
        if patent["authority"] in TARGET_COUNTRIES:
            edges.append(
                {
                    "id": f"edge:{pub}:country:{patent['authority']}",
                    "source": pnode,
                    "target": f"country:{patent['authority']}",
                    "type": "PUBLISHED_IN",
                    "weight": 2,
                }
            )
        edges.append(
            {
                "id": f"edge:{pub}:field:{patent['field']}",
                "source": pnode,
                "target": f"field:{patent['field']}",
                "type": "CLASSIFIED_AS",
                "weight": 3,
            }
        )
        if patent.get("family_id"):
            fid = f"family:{patent['family_id']}"
            add_node(fid, "family", f"Family {patent['family_id']}", mass=5)
            edges.append(
                {
                    "id": f"edge:{pub}:family:{patent['family_id']}",
                    "source": pnode,
                    "target": fid,
                    "type": "IN_FAMILY",
                    "weight": 2,
                }
            )
        if patent.get("assignee"):
            aid = f"applicant:{slug(patent['assignee'])}"
            add_node(aid, "applicant", patent["assignee"], mass=5)
            edges.append(
                {
                    "id": f"edge:{pub}:applicant:{slug(patent['assignee'])}",
                    "source": pnode,
                    "target": aid,
                    "type": "ASSIGNED_TO",
                    "weight": 1.5,
                }
            )
        for term in patent.get("matched_terms") or []:
            tid = f"tech:{slug(term)}"
            add_node(tid, "technology", term, field=patent["field"], mass=4)
            edges.append(
                {
                    "id": f"edge:{pub}:tech:{slug(term)}",
                    "source": pnode,
                    "target": tid,
                    "type": "MENTIONS",
                    "weight": 1,
                }
            )

    country_field_counts = Counter((p["authority"], p["field"]) for p in patents if p["authority"] in TARGET_COUNTRIES)
    for (country, field), count in country_field_counts.items():
        edges.append(
            {
                "id": f"edge:country:{country}:field:{field}",
                "source": f"country:{country}",
                "target": f"field:{field}",
                "type": "COUNTRY_FIELD_ACTIVITY",
                "weight": count,
            }
        )

    return list(nodes.values()), dedupe_edges(edges)


def dedupe_edges(edges: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen = {}
    for edge in edges:
        seen[edge["id"]] = edge
    return list(seen.values())


def slug(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9가-힣]+", "-", value)
    return value.strip("-")[:80] or "unknown"


def build_analysis(patents: list[dict[str, Any]]) -> dict[str, Any]:
    target = [p for p in patents if p["authority"] in TARGET_COUNTRIES]
    by_country = {}
    for cc, meta in TARGET_COUNTRIES.items():
        items = [p for p in target if p["authority"] == cc]
        field_counts = Counter(p["field"] for p in items)
        years = [p["publication_year"] for p in items if p.get("publication_year")]
        by_country[cc] = {
            "country_label_ko": meta["label_ko"],
            "count": len(items),
            "field_counts": dict(field_counts),
            "recent_2020_plus": sum(1 for y in years if y and y >= 2020),
            "earliest_year": min(years) if years else None,
            "latest_year": max(years) if years else None,
            "representative_patents": [p["publication_number"] for p in sorted(items, key=score_patent, reverse=True)[:4]],
        }

    by_field = {}
    for field, meta in TAXONOMY.items():
        items = [p for p in target if p["field"] == field]
        country_counts = Counter(p["authority"] for p in items)
        years = [p["publication_year"] for p in items if p.get("publication_year")]
        top = sorted(items, key=score_patent, reverse=True)[:5]
        by_field[field] = {
            "field_label_ko": meta["label_ko"],
            "count": len(items),
            "country_counts": dict(country_counts),
            "latest_year": max(years) if years else None,
            "top_patents": [
                {
                    "publication_number": p["publication_number"],
                    "title": p["title"],
                    "authority": p["authority"],
                    "score": score_patent(p),
                }
                for p in top
            ],
        }

    yearly = Counter()
    for p in target:
        if p.get("publication_year"):
            yearly[str(p["publication_year"])] += 1

    period_buckets = {
        "pre_2000": 0,
        "2000_2009": 0,
        "2010_2019": 0,
        "2020_2026": 0,
        "unknown": 0,
    }
    for p in target:
        y = p.get("publication_year")
        if not y:
            period_buckets["unknown"] += 1
        elif y < 2000:
            period_buckets["pre_2000"] += 1
        elif y < 2010:
            period_buckets["2000_2009"] += 1
        elif y < 2020:
            period_buckets["2010_2019"] += 1
        else:
            period_buckets["2020_2026"] += 1

    insights = make_insights(by_country, by_field, period_buckets)
    top_patents = [
        {
            "publication_number": p["publication_number"],
            "authority": p["authority"],
            "field": p["field"],
            "field_label_ko": p["field_label_ko"],
            "title": p["title"],
            "publication_year": p.get("publication_year"),
            "score": score_patent(p),
            "source_url": p["source_url"],
        }
        for p in sorted(target, key=score_patent, reverse=True)[:15]
    ]

    return {
        "summary": {
            "total_seed_patents": len(patents),
            "target_country_patents": len(target),
            "countries": list(TARGET_COUNTRIES.keys()),
            "fields": list(TAXONOMY.keys()),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "collection_scope": "first-pass seed corpus, not exhaustive landscape",
        },
        "by_country": by_country,
        "by_field": by_field,
        "yearly_trends": dict(sorted(yearly.items())),
        "period_buckets": period_buckets,
        "insights": insights,
        "top_patents": top_patents,
    }


def make_insights(by_country: dict[str, Any], by_field: dict[str, Any], period_buckets: dict[str, int]) -> list[dict[str, str]]:
    dominant_country = max(by_country.items(), key=lambda item: item[1]["count"])[0]
    recent_share = period_buckets["2020_2026"]
    top_field = max(by_field.items(), key=lambda item: item[1]["count"])[0]
    sparse = [cc for cc, data in by_country.items() if data["count"] <= 2]
    return [
        {
            "title": "초기 코퍼스는 미국 문헌 밀도가 높다",
            "body": f"시드 단계에서는 {TARGET_COUNTRIES[dominant_country]['label_ko']} 공개문헌이 가장 많이 잡혔다. 이는 실제 우위라기보다 영어 공개문헌 접근성과 Google Patents 노출 편향이 섞인 결과로 봐야 한다.",
        },
        {
            "title": "최근축은 위성통신, SAR, 재사용 발사체에 몰린다",
            "body": f"2020년 이후 문헌이 {recent_share}건으로, 서비스 화면에서는 '최근 5년' 필터를 기본값으로 두면 기술 변화가 빠르게 보인다.",
        },
        {
            "title": f"가장 촘촘한 그래프 축은 {TAXONOMY[top_field]['label_ko']}",
            "body": "초기 노드 수 기준으로 이 분야의 문헌과 키워드 연결이 가장 많다. Graph View에서는 이 필드를 은하 중심부에 두고, 국가 노드를 바깥 궤도로 배치하는 구성이 적합하다.",
        },
        {
            "title": "일본 데이터는 공식 재수집 우선순위",
            "body": f"시드 수집에서 적게 잡힌 국가는 {', '.join(sparse) if sparse else '없음'}이다. 특히 J-PlatPat 기반 보강이 필요하다.",
        },
    ]


def make_report_cards(analysis: dict[str, Any]) -> list[dict[str, Any]]:
    cards = []
    for field, data in analysis["by_field"].items():
        cards.append(
            {
                "id": f"report-card:{field}",
                "type": "field_summary",
                "title": data["field_label_ko"],
                "metric": data["count"],
                "metric_label": "시드 문헌",
                "description": field_description(field, data),
                "country_counts": data["country_counts"],
                "top_patents": data["top_patents"][:3],
                "graph_focus_node": f"field:{field}",
            }
        )
    for country, data in analysis["by_country"].items():
        cards.append(
            {
                "id": f"report-card:{country}",
                "type": "country_summary",
                "title": data["country_label_ko"],
                "metric": data["count"],
                "metric_label": "시드 문헌",
                "description": country_description(country, data),
                "field_counts": data["field_counts"],
                "representative_patents": data["representative_patents"],
                "graph_focus_node": f"country:{country}",
            }
        )
    return cards


def field_description(field: str, data: dict[str, Any]) -> str:
    label = TAXONOMY[field]["label_ko"]
    countries = ", ".join(f"{cc} {n}" for cc, n in sorted(data["country_counts"].items()))
    return f"{label} 분야는 현재 시드 코퍼스에서 {data['count']}건이며, 국가 분포는 {countries or '없음'}이다."


def country_description(country: str, data: dict[str, Any]) -> str:
    top = Counter(data["field_counts"]).most_common(1)
    if top:
        field_label = TAXONOMY[top[0][0]]["label_ko"]
        return f"{data['country_label_ko']}은/는 {field_label} 축의 대표 문헌이 먼저 보인다."
    return f"{data['country_label_ko']}은/는 추가 공식 수집이 필요하다."


def write_report(analysis: dict[str, Any], patents: list[dict[str, Any]], cards: list[dict[str, Any]]) -> None:
    summary = analysis["summary"]
    top_patents = analysis["top_patents"][:8]
    by_country_lines = []
    for cc, data in analysis["by_country"].items():
        field_bits = ", ".join(
            f"{TAXONOMY[field]['label_ko']} {count}" for field, count in sorted(data["field_counts"].items())
        )
        by_country_lines.append(
            f"- {data['country_label_ko']}({cc}): {data['count']}건. 주요 분야: {field_bits or '추가 수집 필요'}."
        )

    by_field_lines = []
    for field, data in analysis["by_field"].items():
        country_bits = ", ".join(f"{cc} {count}" for cc, count in sorted(data["country_counts"].items()))
        by_field_lines.append(
            f"- {data['field_label_ko']}: {data['count']}건. 국가 분포: {country_bits or '없음'}."
        )

    insight_lines = [f"- {item['title']}: {item['body']}" for item in analysis["insights"]]
    top_lines = [
        f"- {p['publication_number']} ({p['authority']}, {p.get('publication_year') or '연도 미상'}): {p['title']}"
        for p in top_patents
    ]

    report = f"""# AEROPATENT 항공우주 특허분석 1차 리포트

생성일: {summary['generated_at']}

## 1. 결론 먼저

이번 산출물은 미국, 유럽, 일본, 중국, 한국을 포함한 공개 접근 가능 특허 문헌의 1차 시드 코퍼스다. 전체 exhaustive landscape가 아니라, 웹사이트 설계 검증과 LLM Wiki/Graph View 구현에 바로 넣을 수 있는 구조화 데이터가 목적이다.

- 전체 시드 문헌: {summary['total_seed_patents']}건
- 대상 5개 권역 문헌: {summary['target_country_patents']}건
- 분류 분야: {len(summary['fields'])}개
- Graph View 노드 중심축: 국가, 분야, 기술 키워드, 패밀리, 출원인, 개별 특허

## 2. 핵심 인사이트

{chr(10).join(insight_lines)}

## 3. 국가별 요약

{chr(10).join(by_country_lines)}

## 4. 분야별 요약

{chr(10).join(by_field_lines)}

## 5. 대표 문헌

{chr(10).join(top_lines)}

## 6. 웹사이트 표시 방식

첫 화면은 검색창보다 분석 결과를 먼저 보여주는 것이 좋다. 상단 KPI에는 전체 시드 문헌 수, 최근 2020년 이후 문헌 수, 가장 밀집된 분야, 보강이 필요한 국가를 표시한다. 그 아래에는 분야별 카드 6개를 배치하고, 사용자가 카드를 누르면 오른쪽 보고서 드로어가 열린다.

Graph View는 분야 노드를 중심 성단으로 두고 국가 노드를 바깥 궤도에 둔다. 개별 특허는 별 입자처럼 작게 배치하고, family_id가 있는 문헌은 같은 중력권으로 묶는다. 사용자가 'SAR/원격탐사' 같은 분야를 누르면 카메라가 해당 성단으로 이동하고 오른쪽 카드에는 대표 문헌, 국가 분포, 최근 문헌, 핵심 키워드를 보여준다.

## 7. LLM Wiki 저장 전략

- `normalized/patents.jsonl`: 특허 한 건당 하나의 문서. 필터, 리스트, 상세 페이지의 기본 데이터.
- `normalized/evidence_chunks.jsonl`: 초록, 청구항 발췌, UI 요약을 chunk로 분리. LLM 검색/RAG 입력.
- `graph/nodes.jsonl`, `graph/edges.jsonl`: 3D 그래프 렌더링과 클릭 이동의 직접 입력.
- `reports/site_report_cards.json`: 분석 홈과 오른쪽 보고서 카드의 직접 입력.

## 8. 한계와 다음 단계

이번 데이터는 Google Patents 페이지를 기반으로 만든 공개 접근 시드다. 권리 존속, 법적 상태, 최신 공개 여부는 공식 원천으로 재검증해야 한다. 생산 단계에서는 USPTO ODP, EPO OPS, KIPRIS Plus, J-PlatPat, CNIPA를 국가별 source-of-record로 붙이고, 동일 스키마에 다시 적재하면 된다.

"""
    (ROOT / "reports" / "aeropatent_landscape_report_ko.md").write_text(report, encoding="utf-8")

    limitations = """# Source Limitations

- This is a first-pass seed corpus for product design and graph/RAG implementation.
- It is not a freedom-to-operate, validity, infringement, or legal-status opinion.
- Google Patents legal status and assignee fields may be assumptions or translated.
- Official source refresh needs credentials or compliant interactive export paths:
  USPTO ODP, EPO OPS, KIPRIS Plus, J-PlatPat, and CNIPA.
- Google Patents CSV/XHR bulk download returned rate limiting during manual probing,
  so this run fetched individual publication pages through Jina Reader.
"""
    (ROOT / "reports" / "source_limitations.md").write_text(limitations, encoding="utf-8")


def make_llm_index(patents: list[dict[str, Any]], chunks: list[dict[str, Any]], analysis: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema_version": "aeropatent.llm_wiki.v1",
        "entrypoints": {
            "patents": "normalized/patents.jsonl",
            "chunks": "normalized/evidence_chunks.jsonl",
            "nodes": "graph/nodes.jsonl",
            "edges": "graph/edges.jsonl",
            "report_cards": "reports/site_report_cards.json",
        },
        "recommended_retrieval": [
            "1. Start with field or country node from graph/nodes.jsonl.",
            "2. Follow CLASSIFIED_AS and PUBLISHED_IN edges to patent nodes.",
            "3. Load patent record from normalized/patents.jsonl.",
            "4. Retrieve abstract and claim chunks from normalized/evidence_chunks.jsonl.",
            "5. Use report card for UI-level explanation before deep patent text.",
        ],
        "counts": {
            "patents": len(patents),
            "chunks": len(chunks),
            "target_country_patents": analysis["summary"]["target_country_patents"],
        },
        "default_filters": {
            "countries": list(TARGET_COUNTRIES.keys()),
            "period": "2020_2026",
            "fields": list(TAXONOMY.keys()),
        },
    }


def main() -> None:
    ensure_dirs()
    generated_at = datetime.now(timezone.utc).isoformat()

    source_registry = dict(SOURCE_REGISTRY)
    source_registry["generated_at"] = generated_at
    write_json(ROOT / "config" / "taxonomy.json", TAXONOMY)
    write_json(ROOT / "config" / "source_registry.json", source_registry)
    write_json(ROOT / "config" / "search_protocol.json", SEARCH_PROTOCOL)
    write_json(ROOT / "raw" / "search_evidence" / "seed_patents.json", SEED_PATENTS)

    print(f"Fetching {len(SEED_PATENTS)} patent pages...")
    fetched: list[dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(fetch_one, seed) for seed in SEED_PATENTS]
        for future in concurrent.futures.as_completed(futures):
            fetched.append(future.result())

    fetched.sort(key=lambda item: item["publication_number"])
    patents = [parse_patent(item) for item in fetched]
    patents.sort(key=lambda p: (p["authority"], p["field"], p["publication_number"]))

    chunks = make_chunks(patents)
    nodes, edges = make_graph(patents)
    analysis = build_analysis(patents)
    cards = make_report_cards(analysis)

    write_jsonl(ROOT / "normalized" / "patents.jsonl", patents)
    write_jsonl(ROOT / "normalized" / "evidence_chunks.jsonl", chunks)
    write_jsonl(ROOT / "normalized" / "claims.jsonl", [c for c in chunks if c["chunk_type"] == "claim_excerpt"])
    write_jsonl(
        ROOT / "normalized" / "patent_families.jsonl",
        make_family_rows(patents),
    )
    write_jsonl(ROOT / "graph" / "nodes.jsonl", nodes)
    write_jsonl(ROOT / "graph" / "edges.jsonl", edges)

    write_json(ROOT / "analysis" / "summary_by_country.json", analysis["by_country"])
    write_json(ROOT / "analysis" / "summary_by_field.json", analysis["by_field"])
    write_json(ROOT / "analysis" / "yearly_trends.json", analysis["yearly_trends"])
    write_json(ROOT / "analysis" / "period_buckets.json", analysis["period_buckets"])
    write_json(ROOT / "analysis" / "top_patents.json", analysis["top_patents"])
    write_json(ROOT / "analysis" / "cluster_reports.json", analysis["insights"])
    write_json(ROOT / "reports" / "site_report_cards.json", cards)
    write_json(ROOT / "normalized" / "llm_wiki_index.json", make_llm_index(patents, chunks, analysis))
    write_report(analysis, patents, cards)

    manifest = {
        "generated_at": generated_at,
        "root": str(ROOT),
        "seed_count": len(SEED_PATENTS),
        "patents": len(patents),
        "chunks": len(chunks),
        "nodes": len(nodes),
        "edges": len(edges),
        "fetched": sum(1 for p in patents if p.get("fetched")),
        "fetch_failures": [p["publication_number"] for p in patents if not p.get("fetched")],
        "target_country_counts": {
            cc: analysis["by_country"][cc]["count"] for cc in TARGET_COUNTRIES
        },
        "files": [
            "config/taxonomy.json",
            "config/source_registry.json",
            "config/search_protocol.json",
            "normalized/patents.jsonl",
            "normalized/evidence_chunks.jsonl",
            "normalized/claims.jsonl",
            "normalized/patent_families.jsonl",
            "normalized/llm_wiki_index.json",
            "graph/nodes.jsonl",
            "graph/edges.jsonl",
            "analysis/summary_by_country.json",
            "analysis/summary_by_field.json",
            "analysis/yearly_trends.json",
            "analysis/period_buckets.json",
            "analysis/top_patents.json",
            "analysis/cluster_reports.json",
            "reports/site_report_cards.json",
            "reports/aeropatent_landscape_report_ko.md",
            "reports/source_limitations.md",
        ],
    }
    write_json(ROOT / "manifest.json", manifest)
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


def make_family_rows(patents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    families: dict[str, dict[str, Any]] = {}
    for patent in patents:
        family_id = patent.get("family_id") or f"single:{patent['publication_number']}"
        row = families.setdefault(
            family_id,
            {
                "family_id": family_id,
                "publication_numbers": [],
                "fields": [],
                "authorities": [],
                "country_status_union": {},
                "representative_title": patent["title"],
                "representative_source_url": patent["source_url"],
            },
        )
        row["publication_numbers"].append(patent["publication_number"])
        row["fields"].append(patent["field"])
        row["authorities"].append(patent["authority"])
        for cc, count in (patent.get("family_country_status") or {}).items():
            row["country_status_union"][cc] = max(count, row["country_status_union"].get(cc, 0))

    rows = []
    for row in families.values():
        row["publication_numbers"] = sorted(set(row["publication_numbers"]))
        row["fields"] = sorted(set(row["fields"]))
        row["authorities"] = sorted(set(row["authorities"]))
        rows.append(row)
    rows.sort(key=lambda r: r["family_id"])
    return rows


if __name__ == "__main__":
    main()
