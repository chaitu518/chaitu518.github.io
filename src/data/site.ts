// Everything you'll want to edit lives here — no need to touch the layout.

export const site = {
  name: 'Naga',
  role: 'Java backend engineer — SDE2',
  location: 'Hyderabad, IN',
  handle: 'naga.dev',
  tagline: 'I build the systems that stay up when the load doesn\'t.',
  lede: `Distributed backends — message pipelines, caches, and the reliability work that keeps things fast. I write here about the problems I hit and how I actually fixed them.`,
  now: {
    where: 'Sigmoid',
    what: 'backend for a Goldman Sachs platform',
    years: '~3.5 yrs shipping backends',
  },
};

// Shown in the "focus" bento cell.
export const focus = [
  'Distributed systems',
  'Event streaming',
  'Caching & reliability',
  'System design (LLD/HLD)',
];

export const links = {
  github: 'https://github.com/chaitu518',
  linkedin: 'https://www.linkedin.com/in/naga-sri-sai-chaitanya-kolluri-b1b003168/',
  email: 'mailto:saichaitanya518@gmail.com',
  rss: '/rss.xml',
};

export const projects = [
  {
    name: 'BookMyShow — ticket booking system',
    url: '#',
    desc: 'Concurrency-safe seat locking, a clean showtime/inventory model, and a payment state machine. A study in getting the LLD right before the code.',
  },
  {
    name: 'MediTrack — clinic management',
    url: '#',
    desc: 'A Java console app modelling patients, appointments, and billing with GoF patterns and the Streams API. My OOP-design capstone.',
  },
  {
    name: 'Library Management System',
    url: '#',
    desc: 'Books, patrons, lending, and inventory as a properly decomposed domain — the kind of design interviewers actually ask you to draw.',
  },
];

// `k` marks the tools you want highlighted in the accent colour.
export const stack = [
  { name: 'Java', key: true },
  { name: 'Spring Boot', key: true },
  { name: 'Kafka', key: true },
  { name: 'Redis' },
  { name: 'MySQL' },
  { name: 'MongoDB' },
  { name: 'Docker' },
  { name: 'Kubernetes' },
  { name: 'AWS' },
];
