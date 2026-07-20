(() => {
  const product = (sku, type, name, amount, summary, contents, related = [], extra = {}) => ({
    sku, type, name, amount, summary, contents, related, ...extra
  });

  window.STARGATE_CATALOG = {
    version: "2026-07-20",
    currency: "KRW",
    products: {
      "course-koi-advanced": product("SGE-COURSE-KOI-ADV", "course", "정보올림피아드 심화 (자료구조·알고리즘)", 429000, "자료구조부터 고급 알고리즘까지 대회 문제 해결력을 완성하는 심화 과정", ["자료구조 핵심", "그래프·동적계획법", "문제 풀이·코드 리뷰"], ["book-algorithm-vol1", "book-koi-past"]),
      "course-algorithm-bundle": product("SGE-COURSE-ALGO-BUNDLE", "course", "알고리즘 종합 패키지 (입문+심화)", 690600, "C++ 입문과 정보올림피아드 심화를 하나의 학습 경로로 구성한 패키지", ["C++ 문법과 구현", "자료구조·알고리즘", "입문→심화 로드맵"], ["book-koi-intro", "book-algorithm-vol1", "ebook-algorithm-set"]),
      "course-kmo-number-combination": product("SGE-COURSE-KMO-NC", "course", "KMO 대비 정수론·조합", 384000, "KMO 빈출 정수론과 조합 영역의 개념·증명·기출 적용 과정", ["정수론 핵심", "조합적 사고", "KMO 유형별 풀이"], ["book-kmo-number-combination"]),
      "course-koi-intro": product("SGE-COURSE-KOI-INTRO", "course", "정보올림피아드 입문 (C++ 기초)", 297000, "처음 시작하는 학습자를 위한 C++ 기초와 문제 해결 입문 과정", ["입출력·조건·반복", "배열·함수·STL", "기초 구현 문제"], ["book-koi-intro", "ebook-algorithm-set"]),

      "subscription-bank-monthly": product("SGE-SUB-BANK-M", "subscription", "문제은행 월 구독", 39000, "난이도별 문제, 채점 및 오답노트를 매월 이용하는 구독", ["전 과정 문제", "난이도별 필터", "오답노트"], ["course-koi-intro", "course-koi-advanced"], { interval: "month" }),
      "subscription-bank-yearly": product("SGE-SUB-BANK-Y", "subscription", "문제은행 연 구독", 390000, "문제은행 전 과정을 1년간 이용하는 연간 구독", ["전 과정 무제한", "신규 문제 우선", "2개월 가격 혜택"], ["course-algorithm-bundle"], { interval: "year" }),
      "subscription-mock-monthly": product("SGE-SUB-MOCK-M", "subscription", "월간 모의고사", 49000, "월 2회 실전 모의고사와 성적 분석 및 해설 강의 구독", ["월 2회 모의고사", "성적 리포트", "해설 강의"], ["book-koi-past", "course-koi-advanced"], { interval: "month" }),

      "book-koi-intro": product("SGE-BOOK-KOI-INTRO", "physical_book", "정보올림피아드 입문 교재", 28800, "C++ 기초 강의의 개념 설명과 실습 문제를 담은 입문 교재", ["강의별 핵심 개념", "기초 실습", "복습 체크리스트"], ["course-koi-intro", "course-algorithm-bundle"]),
      "book-algorithm-vol1": product("SGE-BOOK-ALGO-V1", "physical_book", "알고리즘 문제집 상권", 31500, "정보올림피아드 심화 강의와 함께 학습하는 단계별 문제집", ["자료구조", "그래프·탐색", "동적계획법"], ["course-koi-advanced", "course-algorithm-bundle"]),
      "book-koi-past": product("SGE-BOOK-KOI-PAST-2015-2025", "physical_book", "KOI 기출·해설집 (2015-2025)", 37800, "2015–2025 KOI 기출을 유형별로 분류한 실전 해설 교재", ["연도별 기출", "유형별 해설", "실전 체크포인트"], ["course-koi-advanced", "subscription-mock-monthly"]),
      "ebook-algorithm-set": product("SGE-EBOOK-ALGO-SET", "digital_book", "알고리즘 문제집 eBook 세트", 47600, "입문·심화 강의에서 바로 열어볼 수 있는 디지털 문제집 세트", ["입문 eBook", "심화 eBook", "학습 진도표"], ["course-koi-intro", "course-algorithm-bundle"]),
      "book-kmo-number-combination": product("SGE-BOOK-KMO-NC", "digital_book", "KMO 정수론·조합 워크북", 42000, "KMO 정수론·조합 강의에 맞춘 개념·증명·기출 워크북", ["정수론 정리", "조합 증명", "KMO 적용 문제"], ["course-kmo-number-combination"], { status: "planned" }),

      "live-vacation": product("SGE-LIVE-VACATION-4W", "live", "방학 집중 라이브특강 (4주)", 281600, "주말 8회 라이브로 약점을 집중 보완하는 4주 과정", ["주말 라이브 8회", "과제 피드백", "수업 자료"], ["book-algorithm-vol1"]),
      "live-koi-final": product("SGE-LIVE-KOI-FINAL", "offline", "KOI 직전 파이널 캠프", 405000, "KOI 직전 2일간 실전 문제와 시간 관리 전략을 점검하는 캠프", ["실전 모의고사", "오답 분석", "대회 전략"], ["book-koi-past"]),
      "consult-strategy": product("SGE-CONSULT-STRATEGY-90", "consulting", "입시·대회 전략 컨설팅", 250000, "현재 수준과 목표를 진단해 90분 동안 개인 학습 전략을 설계", ["사전 진단", "90분 상담", "학습 로드맵"], ["course-algorithm-bundle"]),
      "mentoring-monthly": product("SGE-MENTOR-M4", "mentoring", "1:1 정기 멘토링", 752000, "월 4회 개인별 진도 관리와 코드·풀이 피드백을 제공", ["월 4회 1:1", "코드·풀이 피드백", "진도 관리"], ["course-koi-advanced"], { interval: "month" })
    }

  };

  window.STARGATE_CATALOG.i18n = {
    en: {
      "course-koi-advanced": { name: "Advanced Computing Olympiad: Data Structures & Algorithms", summary: "Master competition problem-solving from core data structures to advanced algorithms.", contents: ["Core data structures", "Graphs and dynamic programming", "Problem solving and code review"] },
      "course-algorithm-bundle": { name: "Complete Algorithms Package: Beginner + Advanced", summary: "A single learning path from C++ fundamentals to advanced Computing Olympiad preparation.", contents: ["C++ syntax and implementation", "Data structures and algorithms", "Beginner-to-advanced roadmap"] },
      "course-kmo-number-combination": { name: "KMO Number Theory & Combinatorics", summary: "Concepts, proofs, and past-problem applications for high-frequency KMO topics.", contents: ["Core number theory", "Combinatorial thinking", "KMO problem strategies"] },
      "course-koi-intro": { name: "Computing Olympiad Fundamentals: C++ Basics", summary: "C++ fundamentals and introductory problem solving for first-time learners.", contents: ["Input, conditions, and loops", "Arrays, functions, and STL", "Basic implementation problems"] },
      "subscription-bank-monthly": { name: "Monthly Problem Bank", summary: "Monthly access to graded problems, judging, and a personalized mistake notebook.", contents: ["Problems across all programs", "Difficulty filters", "Mistake notebook"] },
      "subscription-bank-yearly": { name: "Annual Problem Bank", summary: "Unlimited annual access to the complete problem bank.", contents: ["Unlimited problem access", "Early access to new problems", "Two-month price benefit"] },
      "subscription-mock-monthly": { name: "Monthly Mock Exams", summary: "Two competition-style mock exams per month with analytics and solution lectures.", contents: ["Two monthly mock exams", "Performance report", "Solution lectures"] },
      "book-koi-intro": { name: "Computing Olympiad Fundamentals Textbook", summary: "A beginner textbook with C++ concepts and hands-on practice aligned to the course.", contents: ["Concepts by lesson", "Beginner exercises", "Review checklists"] },
      "book-algorithm-vol1": { name: "Algorithms Workbook, Volume 1", summary: "A structured workbook designed to accompany the advanced Computing Olympiad course.", contents: ["Data structures", "Graphs and search", "Dynamic programming"] },
      "book-koi-past": { name: "KOI Past Papers & Solutions (2015–2025)", summary: "Past KOI problems from 2015–2025 organized by topic with practical solutions.", contents: ["Problems by year", "Topic-based solutions", "Competition checkpoints"] },
      "ebook-algorithm-set": { name: "Algorithms Workbook eBook Set", summary: "A digital workbook set for immediate use alongside beginner and advanced courses.", contents: ["Beginner eBook", "Advanced eBook", "Study progress tracker"] },
      "book-kmo-number-combination": { name: "KMO Number Theory & Combinatorics Workbook", summary: "A proof and past-problem workbook aligned with the KMO course.", contents: ["Number theory theorems", "Combinatorial proofs", "KMO application problems"] },
      "live-vacation": { name: "Vacation Live Intensive (4 Weeks)", summary: "Eight weekend live sessions focused on correcting individual weaknesses.", contents: ["Eight weekend sessions", "Assignment feedback", "Class materials"] },
      "live-koi-final": { name: "KOI Final Camp", summary: "A two-day final camp for competition problems, review, and time-management strategy.", contents: ["Full mock exam", "Mistake analysis", "Competition strategy"] },
      "consult-strategy": { name: "Admissions & Competition Strategy Consulting", summary: "A 90-minute personal assessment and learning roadmap based on current level and goals.", contents: ["Pre-assessment", "90-minute consultation", "Personal learning roadmap"] },
      "mentoring-monthly": { name: "Ongoing 1:1 Mentoring", summary: "Four monthly sessions with progress management and code or solution feedback.", contents: ["Four 1:1 sessions per month", "Code and solution feedback", "Progress management"] }
    }
  };
})();
