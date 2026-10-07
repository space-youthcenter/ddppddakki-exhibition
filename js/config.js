const CONFIG = Object.freeze({
  GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzXtq4ffMPm9fM_4EboiB3uRPLNky75lKUcafUvOfoSlV60ZOBBDwYqLCBtc7bFOgkkbg/exec",
  REVIEW_FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLSdcm16Ix4SaaYV9xdZQv9fclo86l6voivmoLt5J2GnSL_pemA/viewform?usp=publish-editor",
  // 실제 배포 주소가 정해지면 예: "https://example.com/ddookddakki" 형태로 입력하세요.
  SITE_BASE_URL: "https://space-youthcenter.github.io/ddppddakki-exhibition",
  USE_MOCK_DATA: false,
  VISIT_PROGRAM_ID: "visit",
  VISIT_HOURS: {
    "2026-11-19": [15, 22],
    "2026-11-20": [15, 22],
    "2026-11-21": [9, 18],
    "2026-11-22": [10, 18]
  },
  STORAGE_KEY: "ddookddakki_reservations_v2",
  EVENT_DATES: [
    { value: "2026-11-19", label: "2026.11.19.(목)" },
    { value: "2026-11-20", label: "2026.11.20.(금)" },
    { value: "2026-11-21", label: "2026.11.21.(토)" },
    { value: "2026-11-22", label: "2026.11.22.(일)" }
  ],
  // 테스트용 임시 프로그램명입니다. 실제 프로그램 확정 후 이름과 역 정보를 교체하세요.
  PROGRAMS: [
    { id: "program-1", name: "예약 프로그램 1", station: "공방역 MAKE", capacity: 8 },
    { id: "program-2", name: "예약 프로그램 2", station: "장면역 TAKE", capacity: 8 },
    { id: "program-3", name: "예약 프로그램 3", station: "미래역 WAKE", capacity: 6 },
    { id: "program-4", name: "예약 프로그램 4", station: "환승 프로그램", capacity: 6 }
  ],
  TIME_SLOTS: ["10:00", "11:00", "13:00", "14:00", "15:00", "16:00"],
  // 필요 시 "program-1|2026-11-19|10:00": 6 형태로 날짜·시간별 정원을 덮어씁니다.
  CAPACITY_BY_SLOT: {}
});
