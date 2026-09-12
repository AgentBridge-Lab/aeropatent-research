import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(repoRoot, "web/app/lib/data.ts");
const source = fs.readFileSync(dataPath, "utf8");

const patentsMatch = source.match(/export const PATENTS: Patent\[\] = (\[[\s\S]*?\]);\n\nexport interface Filter/);
if (!patentsMatch) throw new Error("PATENTS 배열을 찾지 못했습니다.");
const patents = JSON.parse(patentsMatch[1]);

const subfieldsMatch = source.match(/export const SUBFIELDS: Subfield\[\] = (\[[\s\S]*?\]);\nexport const APPLICANTS/);
if (!subfieldsMatch) throw new Error("SUBFIELDS 배열을 찾지 못했습니다.");
const subfields = JSON.parse(subfieldsMatch[1]);

const defaultPeriod = source.match(/export const DEFAULT_FILTER: Filter = \{[\s\S]*?period: '([^']+)'/i)?.[1];
if (defaultPeriod !== "all") {
  throw new Error(`기본 검색 기간이 all이 아닙니다: ${defaultPeriod ?? "missing"}`);
}

const recoveryId = "space_launch_propulsion_recovery__rocket-recovery";
const recovery = patents.filter((patent) => patent.subfield_ids?.includes(recoveryId));
const recoveryFamilies = new Set(recovery.map((patent) => patent.family_id ?? patent.id));

if (patents.length !== 63) throw new Error(`대표 문헌 수가 63건이 아닙니다: ${patents.length}`);
if (recovery.length !== 7) throw new Error(`회수 시스템 대표 문헌 수가 7건이 아닙니다: ${recovery.length}`);
if (recoveryFamilies.size !== 6) {
  throw new Error(`회수 시스템 검토 패밀리 수가 6개가 아닙니다: ${recoveryFamilies.size}`);
}

const invalidMembership = patents.filter(
  (patent) => !Array.isArray(patent.subfield_ids) || !patent.subfield_ids.includes(patent.subfield),
);
if (invalidMembership.length > 0) {
  throw new Error(`기본 세부기술이 다중 기술축에 포함되지 않은 문헌이 ${invalidMembership.length}건입니다.`);
}

const focusSource = fs.readFileSync(path.join(repoRoot, "web/app/lib/report-content.ts"), "utf8");
const missingFocus = subfields.filter((subfield) => !focusSource.includes(`'${subfield.id}':`));
if (missingFocus.length > 0) {
  throw new Error(`세부기술 분석 내용이 없는 기술축: ${missingFocus.map((item) => item.id).join(", ")}`);
}

console.log(
  `PASS: 기본 전체 ${patents.length}건, 회수 시스템 ${recovery.length}건/${recoveryFamilies.size}패밀리, 세부기술 내용 ${subfields.length}개`,
);
