/* =========================================================
   시뮬레이션 목록 (2022 개정 교육과정 · 중학교 과학 1~3학년군)
   - 단원 순서는 교육과정 내용 체계 순서를 따릅니다. (출판사별 교과서 순서는 다를 수 있음)
   - 새 시뮬레이션을 추가하려면 해당 단원의 sims 배열에 항목을 추가하세요.
   subject: phy(물리) chem(화학) bio(생명과학) earth(지구과학) sci(통합/과학과 사회)
   ========================================================= */
window.SCI_CATALOG = {
  subjects: {
    phy: { name: '물리', color: '#f26b3a' },
    chem: { name: '화학', color: '#8b5cf6' },
    bio: { name: '생명과학', color: '#16a34a' },
    earth: { name: '지구과학', color: '#0ea5e9' },
    sci: { name: '과학과 사회', color: '#64748b' },
  },
  grades: [
    {
      id: 'g1', name: '1학년', book: '과학 1',
      units: [
        { no: 'Ⅰ', title: '과학과 인류의 지속가능한 삶', subject: 'sci', sims: [] },
        { no: 'Ⅱ', title: '생물의 구성과 다양성', subject: 'bio', sims: [] },
        { no: 'Ⅲ', title: '열', subject: 'phy', sims: [] },
        { no: 'Ⅳ', title: '물질의 상태 변화', subject: 'chem', sims: [] },
        { no: 'Ⅴ', title: '힘의 작용', subject: 'phy', sims: [] },
        {
          no: 'Ⅵ', title: '기체의 성질', subject: 'chem',
          sims: [
            {
              id: 'm1-gas-law', path: 'sims/m1-gas-law/index.html', icon: '🎈',
              steps: ['입자 운동', '압력', '보일 법칙', '그래프', '샤를 법칙', '생활 적용'],
              title: '기체 압력 탐험대',
              desc: '피스톤을 누르고 온도를 바꾸며 기체 입자의 운동으로 압력과 부피의 관계를 알아봐요.',
              tags: ['보일 법칙', '샤를 법칙', '입자 운동'],
            },
          ],
        },
        {
          no: 'Ⅶ', title: '태양계', subject: 'earth',
          sims: [
            {
              id: 'm1-moon-phase', path: 'sims/m1-moon-phase/index.html', icon: '🌙',
              steps: ['햇빛 반사', '지구에서', '위상 변화', '관측', '일식·월식', '궤도 기울기'],
              title: '달 모양 탐정',
              desc: '달을 공전 궤도 위에서 움직여 보며 달의 위상 변화와 일식·월식이 일어나는 원리를 찾아요.',
              tags: ['달의 위상', '공전', '일식·월식'],
            },
          ],
        },
      ],
    },
    {
      id: 'g2', name: '2학년', book: '과학 2',
      units: [
        { no: 'Ⅰ', title: '물질의 특성', subject: 'chem', sims: [] },
        { no: 'Ⅱ', title: '지권의 변화', subject: 'earth', sims: [] },
        { no: 'Ⅲ', title: '빛과 파동', subject: 'phy', sims: [] },
        {
          no: 'Ⅳ', title: '물질의 구성', subject: 'chem',
          sims: [
            {
              id: 'm2-build-atom', path: 'sims/m2-build-atom/index.html', icon: '⚛️',
              steps: ['원자 구조', '중성', '원소', '이온', '이온식'],
              title: '원자·이온 공방',
              desc: '양성자와 전자를 넣고 빼며 원자를 만들고, 전자를 잃거나 얻어 이온이 되는 과정을 체험해요.',
              tags: ['원자 모형', '원소', '이온'],
            },
          ],
        },
        { no: 'Ⅴ', title: '식물과 에너지', subject: 'bio', sims: [] },
        { no: 'Ⅵ', title: '동물과 에너지', subject: 'bio', sims: [] },
        {
          no: 'Ⅶ', title: '전기와 자기', subject: 'phy',
          sims: [
            {
              id: 'm2-ohms-law', path: 'sims/m2-ohms-law/index.html', icon: '💡',
              steps: ['회로', '전류', '전압', '그래프', '저항', '전력'],
              prereq: { id: 'm2-build-atom', why: '전자의 개념' },
              title: '전류 조종사',
              desc: '전압과 저항을 조절해 전구를 원하는 밝기로 켜며 전압·전류·저항의 관계(옴의 법칙)를 찾아요.',
              tags: ['옴의 법칙', '전류', '저항'],
            },
          ],
        },
        { no: 'Ⅷ', title: '별과 우주', subject: 'earth', sims: [] },
      ],
    },
    {
      id: 'g3', name: '3학년', book: '과학 3',
      units: [
        { no: 'Ⅰ', title: '화학 반응의 규칙성', subject: 'chem', sims: [] },
        { no: 'Ⅱ', title: '날씨와 기후변화', subject: 'earth', sims: [] },
        { no: 'Ⅲ', title: '수권과 해수의 순환', subject: 'earth', sims: [] },
        {
          no: 'Ⅳ', title: '운동과 에너지', subject: 'phy',
          sims: [
            {
              id: 'm3-energy-coaster', path: 'sims/m3-energy-coaster/index.html', icon: '🎢',
              steps: ['위치E', '운동E', '보존', '설계', '마찰'],
              title: '에너지 롤러코스터',
              desc: '레일 높이를 바꾸며 수레를 달리게 해, 위치 에너지와 운동 에너지가 서로 전환되는 모습을 관찰해요.',
              tags: ['위치 에너지', '운동 에너지', '역학적 에너지 보존'],
            },
          ],
        },
        { no: 'Ⅴ', title: '자극과 반응', subject: 'bio', sims: [] },
        {
          no: 'Ⅵ', title: '생식과 유전', subject: 'bio',
          sims: [
            {
              id: 'm3-mendel', path: 'sims/m3-mendel/index.html', icon: '🫛',
              steps: ['대립 형질', '우열', '유전자', '분리', '예측', '검정 교배', '독립'],
              title: '완두콩 유전 연구소',
              desc: '멘델처럼 완두를 교배해 자손의 형질을 예측하고, 우열의 원리와 분리의 법칙을 발견해요.',
              tags: ['멘델', '우열의 원리', '분리의 법칙'],
            },
          ],
        },
        { no: 'Ⅶ', title: '재해·재난과 안전', subject: 'sci', sims: [] },
        { no: 'Ⅷ', title: '과학과 나의 미래', subject: 'sci', sims: [] },
      ],
    },
  ],
};
