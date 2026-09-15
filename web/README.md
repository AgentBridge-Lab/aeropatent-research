# AEROPATENT 웹 앱

Next.js 정적 내보내기 앱입니다. 실제 공개 경로는 `/aeropatent-research/`입니다.
자료의 범위와 출처, 전체 사이트 생성 절차는 [상위 README](../README.md)를 참고하세요.

기존 의존성이 준비된 환경에서 실행합니다.

```sh
npm run dev
npm run lint
npm run typecheck
GITHUB_PAGES=true npm run build:site
```

`build:site`는 원본 집계 파일에서 앱 데이터를 동기화하고 Next 페이지, 심층 분석,
탐사 방법론 페이지를 `../docs/`에 함께 생성합니다. 기존 `docs/`는
`../.cache/site-export-backups/`에 백업하며 검증 실패 시 복구합니다.
공개 서버로 배포하는 명령은 아닙니다.

`npm run build`는 앱만 빌드하므로 전체 사이트 갱신에는 사용하지 않습니다.
GitHub Pages 미리보기에서는 위 접두 경로까지 포함해 링크와 이미지 경로를 확인합니다.
