export const site = {
  name: 'Tiaan Viviers',
  shortName: 'Tiaan Viviers',
  title: 'Tiaan Viviers — Data Science & Machine Learning',
  description:
    'Data scientist and engineer building systems to survive contact with reality. Drawn to complex problems, deceptively simple solutions, and working with brilliant people.',
  url: 'https://tiaanviviers.com',
  email: 'tiaanviv@gmail.com',
  role: 'Data Science Student · Stellenbosch University',
  tagline: 'Building systems to survive contact with reality.',
  positioning:
    'I’m Tiaan Viviers, a data scientist and engineer drawn to complex problems, deceptively simple solutions, and working with brilliant people.',
  location: 'Stellenbosch, South Africa',
  social: {
    github: 'https://github.com/TiaanViviers',
    linkedin: 'https://www.linkedin.com/in/tiaan-viviers-375770240/',
  },
  nav: [
    { label: 'Home', href: '/', number: '01' },
    { label: 'Work', href: '/work', number: '02' },
    { label: 'Writing', href: '/writing', number: '03' },
    { label: 'About', href: '/about', number: '04' },
    { label: 'Contact', href: '/contact', number: '05' },
  ],
} as const;

export type NavItem = (typeof site.nav)[number];
