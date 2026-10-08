/* =========================================================
   시뮬레이션 목록 (2022 개정 교육과정 · 중학교 과학 1~3학년군)
   - 교육부 고시 제2022-33호 [별책 9] 과학과 교육과정의 내용 순서 (1)~(23)을 따릅니다.
   - 시뮬레이션 1개 = 성취기준 1개(또는 그 일부). 단원 안에서는 차시 순서대로 배열합니다.
   - 새 시뮬레이션을 추가하려면 해당 단원의 sims 배열에 순서대로 항목을 추가하세요.
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
              id: 'm1-gas-pressure', path: 'sims/m1-gas-pressure/index.html', icon: '🎈',
              title: '기체의 압력',
              std: '9과06-01', stdText: '압력의 의미를 알고, 기체의 압력을 입자의 운동으로 설명할 수 있다.',
              desc: '같은 힘이라도 누르는 면적에 따라 압력이 달라지는 것을 알고, 기체 입자의 충돌로 기체의 압력을 설명해요.',
              tags: ['압력', '입자의 운동', '충돌'],
              steps: ['압력의 뜻', '입자 운동', '충돌과 압력', '적용'],
            },
            {
              id: 'm1-gas-boyle', path: 'sims/m1-gas-boyle/index.html', icon: '💉',
              title: '압력과 부피',
              std: '9과06-02', stdText: '기체의 압력과 부피 관계를 실험 결과로부터 알아내고, 이를 입자 모형으로 해석할 수 있다.',
              desc: '피스톤을 눌러 기체의 부피와 압력을 측정하고, 실험 결과를 입자 모형으로 해석해요.',
              tags: ['압력과 부피', '입자 모형', '실험 결과'],
              steps: ['관찰', '실험', '설명', '적용'],
            },
            {
              id: 'm1-gas-charles', path: 'sims/m1-gas-charles/index.html', icon: '🔥',
              title: '온도와 부피',
              std: '9과06-03', stdText: '기체의 온도와 부피 관계를 실험 결과로부터 알아내고, 이를 입자 모형으로 해석할 수 있다.',
              desc: '기체를 가열하거나 냉각하며 부피 변화를 측정하고, 입자 운동의 변화로 설명해요.',
              tags: ['온도와 부피', '입자 모형', '실험 결과'],
              steps: ['관찰', '실험', '설명', '적용'],
            },
          ],
        },
        {
          no: 'Ⅶ', title: '태양계', subject: 'earth',
          sims: [
            {
              id: 'm1-moon-phase', path: 'sims/m1-moon-phase/index.html', icon: '🌙',
              title: '달의 위상 변화',
              std: '9과07-04', stdText: '달을 관측하여 달의 위상변화 원리를 이해하고, 일식과 월식을 설명할 수 있다.',
              desc: '달이 공전하며 햇빛을 받는 부분이 지구에서 보이는 정도가 달라져 모양이 바뀌는 원리를 모형으로 알아봐요.',
              tags: ['달의 위상', '공전', '햇빛 반사'],
              steps: ['관찰', '모형', '원리', '적용'],
            },
            {
              id: 'm1-eclipse', path: 'sims/m1-eclipse/index.html', icon: '🌑',
              title: '일식과 월식',
              std: '9과07-04', stdText: '달을 관측하여 달의 위상변화 원리를 이해하고, 일식과 월식을 설명할 수 있다.',
              desc: '태양·지구·달이 일직선에 놓일 때 생기는 그림자로 일식과 월식을 설명해요.',
              tags: ['일식', '월식', '그림자'],
              steps: ['그림자', '일식', '월식', '적용'],
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
              title: '원자의 구조',
              std: '9과11-02', stdText: '원소를 구성하는 입자인 원자는 양성자, 중성자, 전자로 구성되며, 양성자의 수에 따라 원소의 종류가 달라짐을 입자 모형을 활용하여 설명할 수 있다.',
              desc: '양성자·중성자·전자로 원자를 만들어 보고, 양성자 수에 따라 원소의 종류가 달라지는 것을 확인해요.',
              tags: ['양성자', '중성자', '전자', '원소'],
              steps: ['구성 입자', '중성', '원소 결정', '적용'],
            },
            {
              id: 'm2-ion', path: 'sims/m2-ion/index.html', icon: '⚡',
              title: '이온의 형성',
              std: '9과11-04', stdText: '물질을 이루는 입자는 원자, 분자, 이온 등으로 존재할 수 있음을 알고, 이온은 전하를 띠고 있음을 설명할 수 있다.',
              desc: '전기적으로 중성인 원자가 전자를 잃거나 얻어 이온이 되는 과정을 체험하고, 이온이 전하를 띠는 것을 확인해요.',
              tags: ['양이온', '음이온', '전하'],
              steps: ['중성 원자', '양이온', '음이온', '이온의 이동'],
            },
          ],
        },
        { no: 'Ⅴ', title: '식물과 에너지', subject: 'bio', sims: [] },
        { no: 'Ⅵ', title: '동물과 에너지', subject: 'bio', sims: [] },
        {
          no: 'Ⅶ', title: '전기와 자기', subject: 'phy',
          sims: [
            {
              id: 'm2-circuit', path: 'sims/m2-circuit/index.html', icon: '🔌',
              title: '전류의 모형',
              std: '9과14-02', stdText: '전기 회로에서 전류를 모형으로 설명하고, 실험을 통해 저항, 전류, 전압 사이의 관계를 이끌어낼 수 있다.',
              desc: '전기 회로 속 전자의 이동을 모형으로 보며 전류와 전압의 뜻을 알아봐요.',
              tags: ['전기 회로', '전류', '전자의 이동', '전압'],
              steps: ['회로', '전류', '전류 모형', '전압'],
              prereq: { id: 'm2-build-atom', why: '전자의 개념' },
            },
            {
              id: 'm2-ohms-law', path: 'sims/m2-ohms-law/index.html', icon: '💡',
              title: '전압·전류·저항의 관계',
              std: '9과14-02', stdText: '전기 회로에서 전류를 모형으로 설명하고, 실험을 통해 저항, 전류, 전압 사이의 관계를 이끌어낼 수 있다.',
              desc: '전압과 저항을 바꾸며 전류를 측정하고, 실험 결과에서 세 양의 관계를 이끌어내요.',
              tags: ['전압', '전류', '저항', '옴의 법칙'],
              steps: ['저항', '전압과 전류', '저항과 전류', '적용'],
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
              id: 'm3-free-fall', path: 'sims/m3-free-fall/index.html', icon: '🍎',
              title: '자유 낙하 운동',
              std: '9과19-02', stdText: '자유 낙하하는 물체의 운동에서 시간에 따른 속력의 변화가 일정함을 분석할 수 있다.',
              desc: '물체를 떨어뜨려 일정한 시간 간격으로 기록하고, 속력이 1초마다 9.8 m/s씩 일정하게 증가함을 분석해요.',
              tags: ['자유 낙하', '속력 변화', '시간-속력 그래프'],
              steps: ['낙하 관찰', '속력 기록', '변화 분석', '예측'],
            },
            {
              id: 'm3-work-energy', path: 'sims/m3-work-energy/index.html', icon: '🏋️',
              title: '일과 에너지',
              std: '9과19-03', stdText: '일의 정의를 알고, 자유 낙하하는 물체의 운동에서 중력이 한 일을 위치 에너지와 운동 에너지로 표현할 수 있다.',
              desc: '물체를 들어 올리는 일이 위치 에너지로, 떨어지며 중력이 한 일이 운동 에너지로 바뀌는 것을 확인해요.',
              tags: ['일', '위치 에너지', '운동 에너지'],
              steps: ['일의 뜻', '위치 에너지', '운동 에너지', '적용'],
            },
            {
              id: 'm3-energy-coaster', path: 'sims/m3-energy-coaster/index.html', icon: '🎢',
              title: '역학적 에너지 보존',
              std: '9과19-04', stdText: '물체의 운동에서 역학적 에너지의 전환과 보존을 이해하고, 이를 활용하여 일상생활 속 물체의 운동을 예측할 수 있다.',
              desc: '진자와 롤러코스터에서 위치 에너지와 운동 에너지가 서로 전환되고 그 합이 보존되는 것을 확인하고, 운동을 예측해요.',
              tags: ['역학적 에너지', '에너지 전환', '보존'],
              steps: ['전환', '보존', '예측', '적용'],
            },
          ],
        },
        { no: 'Ⅴ', title: '자극과 반응', subject: 'bio', sims: [] },
        {
          no: 'Ⅵ', title: '생식과 유전', subject: 'bio',
          sims: [
            {
              id: 'm3-mendel', path: 'sims/m3-mendel/index.html', icon: '🫛',
              title: '우열의 원리와 분리의 법칙',
              std: '9과21-04', stdText: '멘델 유전 실험의 의의와 원리를 이해하고, 멘델 유전 원리가 적용되는 유전 현상을 조사하여 협력적으로 소통할 수 있다.',
              desc: '멘델처럼 완두를 교배해 잡종 1대와 잡종 2대의 형질을 관찰하고, 우열의 원리와 분리의 법칙을 찾아요.',
              tags: ['멘델', '우열의 원리', '분리의 법칙'],
              steps: ['대립 형질', '우열', '분리', '적용'],
            },
            {
              id: 'm3-mendel-ind', path: 'sims/m3-mendel-ind/index.html', icon: '🌈',
              title: '독립의 법칙',
              std: '9과21-04', stdText: '멘델 유전 실험의 의의와 원리를 이해하고, 멘델 유전 원리가 적용되는 유전 현상을 조사하여 협력적으로 소통할 수 있다.',
              desc: '두 쌍의 대립 형질을 함께 교배해, 각 형질이 서로 영향을 주지 않고 따로 유전되는 것을 확인해요.',
              tags: ['독립의 법칙', '두 쌍의 대립 형질', '9:3:3:1'],
              steps: ['두 형질', '잡종 1대', '잡종 2대', '적용'],
            },
          ],
        },
        { no: 'Ⅶ', title: '재해·재난과 안전', subject: 'sci', sims: [] },
        { no: 'Ⅷ', title: '과학과 나의 미래', subject: 'sci', sims: [] },
      ],
    },
  ],
};
