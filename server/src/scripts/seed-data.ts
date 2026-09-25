// Sample data for the seed script. All people and companies are fictional; emails use reserved example domains.
import type { CompanySize, ContractType, Proficiency, Seniority, WorkMode, Availability } from '../types/index.js'

export interface SeedCompany {
  key: string
  name: string
  email: string
  website: string
  industry: string
  size: CompanySize
  description: string
  contact: { name: string; title: string }
  status: 'approved' | 'pending'
}

export const companies: SeedCompany[] = [
  {
    key: 'northstar',
    name: 'Northstar Labs',
    email: 'hiring@northstar.example',
    website: 'https://northstar.example',
    industry: 'Software',
    size: '51-200',
    description: 'Northstar Labs builds analytics software that helps retailers forecast demand and cut waste.',
    contact: { name: 'Clara Fontaine', title: 'Head of Talent' },
    status: 'approved',
  },
  {
    key: 'luma',
    name: 'Luma Health',
    email: 'talent@lumahealth.example',
    website: 'https://lumahealth.example',
    industry: 'Healthtech',
    size: '201-500',
    description: 'Luma Health makes remote patient monitoring simple for clinics across Europe.',
    contact: { name: 'Jonas Weber', title: 'People Partner' },
    status: 'approved',
  },
  {
    key: 'maven',
    name: 'Maven Studio',
    email: 'jobs@mavenstudio.example',
    website: 'https://mavenstudio.example',
    industry: 'Design agency',
    size: '11-50',
    description: 'Maven Studio is a product design agency working with startups on brand, web and mobile products.',
    contact: { name: 'Inês Carvalho', title: 'Studio Director' },
    status: 'approved',
  },
  {
    key: 'orbit',
    name: 'Orbit Logistics',
    email: 'recruiting@orbitlogistics.example',
    website: 'https://orbitlogistics.example',
    industry: 'Logistics',
    size: '501-1000',
    description: 'Orbit Logistics runs cross-border freight for e-commerce brands.',
    contact: { name: 'Samuel Adeyemi', title: 'HR Manager' },
    status: 'pending',
  },
]

export interface SeedJob {
  key: string
  company: string
  title: string
  location: string
  workMode: WorkMode
  contractType: ContractType
  seniority: Seniority
  requiredSkills: string[]
  niceToHaveSkills: string[]
  languages: [string, Proficiency][]
  featured?: boolean
  status: 'open' | 'pending' | 'closed'
  daysAgo: number
  coverLetterPolicy?: 'none' | 'optional' | 'required'
  summary: string
  responsibilities: string[]
  requirements: string[]
}

export const jobs: SeedJob[] = [
  {
    key: 'fe',
    company: 'northstar',
    title: 'Senior Frontend Engineer',
    location: 'Remote (EU)',
    workMode: 'remote',
    contractType: 'full-time',
    seniority: 'senior',
    requiredSkills: ['React', 'TypeScript', 'Testing'],
    niceToHaveSkills: ['Next.js', 'Data visualization'],
    languages: [['English', 'fluent']],
    featured: true,
    status: 'open',
    daysAgo: 3,
    summary: 'Own the web app our customers use every day to plan inventory, from design system to performance.',
    responsibilities: ['Build and ship features across our React + TypeScript app', 'Shape our component library and design system', 'Improve performance and accessibility', 'Mentor mid-level engineers through reviews and pairing'],
    requirements: ['5+ years building production web apps', 'Deep knowledge of React and TypeScript', 'Habit of writing tests that catch real bugs'],
  },
  {
    key: 'be',
    company: 'northstar',
    title: 'Backend Engineer (Node.js)',
    location: 'Lisbon, Portugal',
    workMode: 'hybrid',
    contractType: 'full-time',
    seniority: 'mid',
    requiredSkills: ['Node.js', 'TypeScript', 'MongoDB'],
    niceToHaveSkills: ['Kafka', 'AWS'],
    languages: [['English', 'fluent']],
    status: 'open',
    daysAgo: 12,
    summary: 'Design APIs and data pipelines that process millions of sales events a day.',
    responsibilities: ['Design and build REST APIs in Node.js', 'Model data in MongoDB and keep queries fast', 'Own services end to end, including on-call rotation'],
    requirements: ['3+ years with Node.js in production', 'Solid understanding of databases and indexing', 'Comfortable with TypeScript'],
  },
  {
    key: 'da',
    company: 'northstar',
    title: 'Data Analyst',
    location: 'Paris, France',
    workMode: 'hybrid',
    contractType: 'full-time',
    seniority: 'mid',
    requiredSkills: ['SQL', 'Python', 'Data analysis'],
    niceToHaveSkills: ['dbt', 'Tableau'],
    languages: [['French', 'fluent'], ['English', 'conversational']],
    featured: true,
    status: 'open',
    daysAgo: 6,
    summary: 'Turn retail data into insights for our French-speaking customers.',
    responsibilities: ['Build dashboards and recurring reports', 'Run ad-hoc analyses with customer success', 'Present findings to customers in French'],
    requirements: ['2+ years as a data or BI analyst', 'Strong SQL and working Python', 'Fluent French'],
  },
  {
    key: 'devops',
    company: 'northstar',
    title: 'DevOps Engineer',
    location: 'Remote (EU)',
    workMode: 'remote',
    contractType: 'contract',
    seniority: 'senior',
    requiredSkills: ['AWS', 'Kubernetes', 'Terraform'],
    niceToHaveSkills: ['Go'],
    languages: [['English', 'fluent']],
    status: 'pending',
    daysAgo: 1,
    summary: 'A 6-month contract to move our infrastructure to Kubernetes.',
    responsibilities: ['Plan and run the migration to EKS', 'Write infrastructure as code with Terraform', 'Set up monitoring and alerting'],
    requirements: ['Several Kubernetes migrations behind you', 'Strong AWS and Terraform experience'],
  },
  {
    key: 'ml',
    company: 'luma',
    title: 'Machine Learning Engineer',
    location: 'Berlin, Germany',
    workMode: 'onsite',
    contractType: 'full-time',
    seniority: 'senior',
    requiredSkills: ['Python', 'Machine learning', 'PyTorch'],
    niceToHaveSkills: ['MLOps', 'Healthcare data'],
    languages: [['English', 'fluent']],
    featured: true,
    status: 'open',
    daysAgo: 2,
    coverLetterPolicy: 'required',
    summary: 'Build models that detect early warning signs in patient vital signs.',
    responsibilities: ['Train and evaluate models on time-series health data', 'Deploy models safely to production', 'Work with clinicians to validate results'],
    requirements: ['4+ years in applied machine learning', 'Production experience with PyTorch', 'Care for privacy and data protection (GDPR)'],
  },
  {
    key: 'pm',
    company: 'luma',
    title: 'Product Manager',
    location: 'Amsterdam, Netherlands',
    workMode: 'hybrid',
    contractType: 'full-time',
    seniority: 'lead',
    requiredSkills: ['Product management', 'User research', 'Roadmapping'],
    niceToHaveSkills: ['Healthcare'],
    languages: [['English', 'fluent'], ['Dutch', 'basic']],
    status: 'open',
    daysAgo: 20,
    summary: 'Lead the product for our clinician dashboard.',
    responsibilities: ['Own the roadmap for the clinician product', 'Run discovery with clinics and patients', 'Work daily with design and engineering'],
    requirements: ['5+ years in product management', 'Experience with B2B SaaS', 'Excellent written communication'],
  },
  {
    key: 'qa',
    company: 'luma',
    title: 'QA Engineer',
    location: 'Remote (EU)',
    workMode: 'remote',
    contractType: 'part-time',
    seniority: 'junior',
    requiredSkills: ['Testing', 'Cypress'],
    niceToHaveSkills: ['JavaScript'],
    languages: [['English', 'conversational']],
    status: 'closed',
    daysAgo: 45,
    summary: 'Help us keep releases stable with manual and automated testing.',
    responsibilities: ['Write and maintain end-to-end tests', 'Test new features before release'],
    requirements: ['Some experience with test automation'],
  },
  {
    key: 'design',
    company: 'maven',
    title: 'Senior Product Designer',
    location: 'Lisbon, Portugal',
    workMode: 'hybrid',
    contractType: 'full-time',
    seniority: 'senior',
    requiredSkills: ['Figma', 'Product design', 'Prototyping'],
    niceToHaveSkills: ['Design systems', 'User research'],
    languages: [['English', 'fluent'], ['Portuguese', 'conversational']],
    status: 'open',
    daysAgo: 9,
    coverLetterPolicy: 'optional',
    summary: 'Lead design on client projects from first sketch to launch.',
    responsibilities: ['Lead product design for two to three clients at a time', 'Run workshops and usability tests', 'Build and maintain design systems in Figma'],
    requirements: ['5+ years of product design', 'A portfolio showing shipped products', 'Confident presenting to clients'],
  },
  {
    key: 'ux',
    company: 'maven',
    title: 'UX Researcher',
    location: 'Remote (EU)',
    workMode: 'remote',
    contractType: 'freelance',
    seniority: 'mid',
    requiredSkills: ['User research', 'Usability testing'],
    niceToHaveSkills: ['Figma', 'Survey design'],
    languages: [['English', 'fluent']],
    status: 'open',
    daysAgo: 15,
    coverLetterPolicy: 'none',
    summary: 'Plan and run research studies for our client projects.',
    responsibilities: ['Plan interviews and usability studies', 'Synthesize findings into clear recommendations'],
    requirements: ['3+ years of UX research', 'Examples of research that changed a product'],
  },
  {
    key: 'growth',
    company: 'maven',
    title: 'Growth Marketing Lead',
    location: 'Paris, France',
    workMode: 'onsite',
    contractType: 'full-time',
    seniority: 'lead',
    requiredSkills: ['Growth', 'B2B marketing', 'Analytics'],
    niceToHaveSkills: ['SEO', 'HubSpot'],
    languages: [['French', 'native'], ['English', 'fluent']],
    status: 'open',
    daysAgo: 30,
    summary: "Grow Maven Studio's pipeline of new clients.",
    responsibilities: ['Own our marketing funnel and budget', 'Run campaigns across content, events and paid channels', 'Report on pipeline and revenue'],
    requirements: ['6+ years in B2B marketing', 'Track record of measurable growth', 'Native or fluent French'],
  },
]

export interface SeedCandidate {
  name: string
  country: string
  city: string
  headline: string
  years: number
  skills: [string, number][]
  tools: string[]
  languages: [string, Proficiency][]
  workMode: WorkMode
  availability: Availability
  noticeWeeks?: number
  employers: [string, string][] // [company, role], most recent first
  education: [string, string, string, number] // institution, degree, field, year
  highlight: string // a sentence for the CV
  visible?: boolean
}

export const candidates: SeedCandidate[] = [
  // Frontend
  { name: 'Amara Okafor', country: 'Nigeria', city: 'Lagos', headline: 'Senior Frontend Engineer', years: 7, skills: [['React', 6], ['TypeScript', 5], ['Testing', 4], ['Next.js', 3]], tools: ['Vite', 'Jest', 'Storybook', 'Git'], languages: [['English', 'fluent'], ['Yoruba', 'native']], workMode: 'remote', availability: 'notice_period', noticeWeeks: 4, employers: [['Paystream', 'Senior Frontend Engineer'], ['Kora Digital', 'Frontend Developer']], education: ['University of Lagos', 'BSc', 'Computer Science', 2016], highlight: 'Led the rebuild of a payments dashboard in React and TypeScript, cutting load time by 40%.' },
  { name: 'Lucas Martin', country: 'France', city: 'Lyon', headline: 'Frontend Developer', years: 4, skills: [['React', 4], ['JavaScript', 5], ['CSS', 5], ['Accessibility', 2]], tools: ['Figma', 'Webpack', 'Cypress'], languages: [['French', 'native'], ['English', 'fluent']], workMode: 'hybrid', availability: 'immediately', employers: [['Voyagio', 'Frontend Developer'], ['Agence Lumen', 'Web Developer']], education: ['INSA Lyon', 'MSc', 'Software Engineering', 2020], highlight: 'Brought a travel booking site to WCAG 2.1 AA compliance.' },
  { name: 'Sofia Lindqvist', country: 'Sweden', city: 'Stockholm', headline: 'Frontend Engineer, design systems', years: 6, skills: [['React', 5], ['TypeScript', 4], ['Design systems', 4], ['Testing', 3]], tools: ['Storybook', 'Figma', 'Playwright'], languages: [['Swedish', 'native'], ['English', 'fluent']], workMode: 'remote', availability: 'notice_period', noticeWeeks: 8, employers: [['Nordbank', 'Frontend Engineer'], ['Klarsyn', 'UI Developer']], education: ['KTH Royal Institute of Technology', 'MSc', 'Media Technology', 2018], highlight: 'Created a design system used by 12 product teams.' },
  { name: 'Mateo García', country: 'Spain', city: 'Barcelona', headline: 'Junior Frontend Developer', years: 1, skills: [['React', 1], ['JavaScript', 2], ['HTML', 2]], tools: ['Git', 'VS Code'], languages: [['Spanish', 'native'], ['Catalan', 'native'], ['English', 'conversational']], workMode: 'onsite', availability: 'immediately', employers: [['Tapas Tech', 'Junior Developer']], education: ['Universitat de Barcelona', 'BSc', 'Computer Engineering', 2024], highlight: 'Built an internal booking tool used by 200 restaurant staff.' },
  { name: 'Priya Nair', country: 'United Kingdom', city: 'London', headline: 'Senior Frontend Engineer', years: 9, skills: [['React', 7], ['TypeScript', 6], ['Data visualization', 5], ['Testing', 5]], tools: ['D3', 'Vite', 'Jest', 'GraphQL'], languages: [['English', 'native'], ['Hindi', 'fluent']], workMode: 'hybrid', availability: 'notice_period', noticeWeeks: 12, employers: [['Ledgerly', 'Staff Frontend Engineer'], ['ChartHouse', 'Senior Frontend Engineer']], education: ['University College London', 'MEng', 'Computer Science', 2015], highlight: 'Designed interactive financial charts with D3 used by 50,000 analysts.', visible: false },

  // Backend
  { name: 'Daniel Mensah', country: 'Ghana', city: 'Accra', headline: 'Backend Engineer (Node.js)', years: 5, skills: [['Node.js', 5], ['TypeScript', 4], ['MongoDB', 4], ['AWS', 2]], tools: ['Docker', 'Redis', 'Postman'], languages: [['English', 'fluent'], ['Twi', 'native']], workMode: 'remote', availability: 'immediately', employers: [['Accra PayTech', 'Backend Engineer'], ['GoldCoast Code', 'Software Developer']], education: ['University of Ghana', 'BSc', 'Computer Science', 2019], highlight: 'Scaled a mobile-money API to 3 million requests a day.' },
  { name: 'Hannah Schmidt', country: 'Germany', city: 'Munich', headline: 'Backend Developer, Java and Kafka', years: 8, skills: [['Java', 8], ['Kafka', 4], ['PostgreSQL', 6], ['Node.js', 2]], tools: ['Spring Boot', 'Kubernetes', 'Grafana'], languages: [['German', 'native'], ['English', 'fluent']], workMode: 'hybrid', availability: 'notice_period', noticeWeeks: 12, employers: [['Autoteile24', 'Senior Backend Developer'], ['Versicherung AG', 'Java Developer']], education: ['TU München', 'MSc', 'Informatics', 2016], highlight: 'Moved a monolith to event-driven services with Kafka.' },
  { name: 'Rui Almeida', country: 'Portugal', city: 'Lisbon', headline: 'Node.js Developer', years: 3, skills: [['Node.js', 3], ['TypeScript', 2], ['MongoDB', 3]], tools: ['Express', 'Docker', 'Jest'], languages: [['Portuguese', 'native'], ['English', 'fluent']], workMode: 'hybrid', availability: 'immediately', employers: [['Lusa Fashion', 'Backend Developer']], education: ['Instituto Superior Técnico', 'BSc', 'Computer Engineering', 2021], highlight: 'Wrote the order-tracking API for a fashion marketplace.' },
  { name: 'Yuki Tanaka', country: 'Netherlands', city: 'Rotterdam', headline: 'Platform Engineer', years: 6, skills: [['Go', 4], ['Kubernetes', 4], ['AWS', 5], ['Terraform', 3]], tools: ['Helm', 'Prometheus', 'GitHub Actions'], languages: [['Japanese', 'native'], ['English', 'fluent'], ['Dutch', 'basic']], workMode: 'remote', availability: 'notice_period', noticeWeeks: 4, employers: [['PortFlow', 'Platform Engineer'], ['CloudNine', 'DevOps Engineer']], education: ['Osaka University', 'BEng', 'Information Science', 2017], highlight: 'Migrated 40 services to Kubernetes with zero downtime.' },

  // Data
  { name: 'Camille Dubois', country: 'France', city: 'Paris', headline: 'Data Analyst', years: 3, skills: [['SQL', 3], ['Python', 2], ['Data analysis', 3], ['Tableau', 2]], tools: ['dbt', 'BigQuery', 'Excel'], languages: [['French', 'native'], ['English', 'fluent']], workMode: 'hybrid', availability: 'immediately', employers: [['Maison Retail', 'Data Analyst'], ['StatConseil', 'Junior Analyst']], education: ['Université Paris-Dauphine', 'MSc', 'Business Analytics', 2021], highlight: 'Built a weekly sales dashboard used by 80 store managers.' },
  { name: 'Youssef El Amrani', country: 'Morocco', city: 'Casablanca', headline: 'Data Analyst, French and Arabic', years: 4, skills: [['SQL', 4], ['Python', 3], ['Data analysis', 4], ['Power BI', 3]], tools: ['Excel', 'PostgreSQL', 'Airflow'], languages: [['Arabic', 'native'], ['French', 'fluent'], ['English', 'conversational']], workMode: 'remote', availability: 'notice_period', noticeWeeks: 4, employers: [['Atlas Telecom', 'Data Analyst'], ['Maroc Assurances', 'BI Analyst']], education: ['Université Hassan II', 'MSc', 'Statistics', 2020], highlight: 'Reduced churn 8% with a customer segmentation model.' },
  { name: 'Emma Rossi', country: 'Italy', city: 'Milan', headline: 'Senior Data Analyst', years: 7, skills: [['SQL', 7], ['Python', 5], ['Data analysis', 7], ['Statistics', 6]], tools: ['Looker', 'Snowflake', 'dbt'], languages: [['Italian', 'native'], ['English', 'fluent'], ['French', 'conversational']], workMode: 'hybrid', availability: 'notice_period', noticeWeeks: 8, employers: [['ModaNet', 'Senior Data Analyst'], ['Banca Nord', 'Data Analyst']], education: ['Bocconi University', 'MSc', 'Economics', 2017], highlight: 'Led the move from spreadsheets to a Snowflake + dbt analytics stack.' },
  { name: 'Kwame Asante', country: 'Ghana', city: 'Kumasi', headline: 'Junior Data Analyst', years: 1, skills: [['SQL', 1], ['Excel', 2], ['Data analysis', 1]], tools: ['Google Sheets', 'Metabase'], languages: [['English', 'fluent']], workMode: 'remote', availability: 'immediately', employers: [['AgriData', 'Data Intern']], education: ['KNUST', 'BSc', 'Mathematics', 2024], highlight: 'Automated monthly farm yield reports with SQL.' },

  // Machine learning
  { name: 'Lena Fischer', country: 'Germany', city: 'Berlin', headline: 'Machine Learning Engineer', years: 5, skills: [['Python', 6], ['Machine learning', 5], ['PyTorch', 4], ['MLOps', 3]], tools: ['MLflow', 'Docker', 'Airflow'], languages: [['German', 'native'], ['English', 'fluent']], workMode: 'onsite', availability: 'notice_period', noticeWeeks: 12, employers: [['MedAI Berlin', 'ML Engineer'], ['Modehaus Online', 'Data Scientist']], education: ['Humboldt University of Berlin', 'MSc', 'Computer Science', 2019], highlight: 'Deployed a time-series anomaly detection model for ICU monitoring data, following GDPR requirements.' },
  { name: 'Arjun Mehta', country: 'India', city: 'Bengaluru', headline: 'Senior ML Engineer, NLP', years: 8, skills: [['Python', 8], ['Machine learning', 7], ['NLP', 5], ['PyTorch', 5]], tools: ['Hugging Face', 'Kubernetes', 'Spark'], languages: [['English', 'fluent'], ['Hindi', 'native']], workMode: 'remote', availability: 'notice_period', noticeWeeks: 8, employers: [['LinguaAI', 'Senior ML Engineer'], ['DataWorks', 'Data Scientist']], education: ['IIT Bombay', 'MTech', 'Computer Science', 2016], highlight: 'Built a multilingual document classifier serving 10 million requests a month.' },
  { name: 'Chloé Bernard', country: 'Belgium', city: 'Brussels', headline: 'Data Scientist', years: 3, skills: [['Python', 4], ['Machine learning', 3], ['Statistics', 4], ['SQL', 3]], tools: ['scikit-learn', 'Jupyter', 'Pandas'], languages: [['French', 'native'], ['Dutch', 'conversational'], ['English', 'fluent']], workMode: 'hybrid', availability: 'immediately', employers: [['EuroHealth Analytics', 'Data Scientist']], education: ['KU Leuven', 'MSc', 'Statistics', 2021], highlight: 'Forecast hospital bed demand with 92% accuracy.' },

  // Design
  { name: 'Inês Costa', country: 'Portugal', city: 'Porto', headline: 'Senior Product Designer', years: 8, skills: [['Figma', 6], ['Product design', 8], ['Prototyping', 6], ['Design systems', 5]], tools: ['Figma', 'Maze', 'Notion'], languages: [['Portuguese', 'native'], ['English', 'fluent']], workMode: 'hybrid', availability: 'notice_period', noticeWeeks: 4, employers: [['CallPilot', 'Senior Product Designer'], ['Studio Norte', 'Product Designer']], education: ['University of Porto', 'MA', 'Design', 2016], highlight: 'Redesigned a contact-center app, raising task success from 64% to 91%.' },
  { name: 'Oliver Bennett', country: 'Ireland', city: 'Dublin', headline: 'Product Designer', years: 4, skills: [['Figma', 4], ['Product design', 4], ['User research', 2]], tools: ['Figma', 'FigJam', 'Miro'], languages: [['English', 'native']], workMode: 'remote', availability: 'immediately', employers: [['Fintree', 'Product Designer']], education: ['National College of Art and Design', 'BA', 'Visual Communication', 2020], highlight: 'Designed the onboarding flow of a banking app used by 300,000 customers.' },
  { name: 'Nadia Haddad', country: 'Lebanon', city: 'Beirut', headline: 'UX Researcher', years: 5, skills: [['User research', 5], ['Usability testing', 5], ['Survey design', 3]], tools: ['Dovetail', 'Maze', 'Figma'], languages: [['Arabic', 'native'], ['English', 'fluent'], ['French', 'fluent']], workMode: 'remote', availability: 'immediately', employers: [['MENA Commerce', 'UX Researcher'], ['Cedar Labs', 'Research Assistant']], education: ['American University of Beirut', 'MA', 'Psychology', 2019], highlight: 'Ran 120+ user interviews across 6 countries for an e-commerce app.' },
  { name: 'Tomás Novak', country: 'Czech Republic', city: 'Prague', headline: 'UI Designer', years: 2, skills: [['Figma', 2], ['UI design', 2], ['Illustration', 3]], tools: ['Figma', 'Illustrator'], languages: [['Czech', 'native'], ['English', 'conversational']], workMode: 'onsite', availability: 'immediately', employers: [['Pixel Praha', 'Junior UI Designer']], education: ['Academy of Arts, Architecture and Design in Prague', 'BA', 'Graphic Design', 2023], highlight: 'Illustrated and designed a children’s learning app.', visible: false },

  // Product
  { name: 'Sarah Cohen', country: 'Netherlands', city: 'Amsterdam', headline: 'Senior Product Manager', years: 9, skills: [['Product management', 8], ['Roadmapping', 7], ['User research', 5]], tools: ['Jira', 'Amplitude', 'Productboard'], languages: [['English', 'fluent'], ['Hebrew', 'native'], ['Dutch', 'conversational']], workMode: 'hybrid', availability: 'notice_period', noticeWeeks: 8, employers: [['CareConnect', 'Senior Product Manager'], ['Staywise', 'Product Manager']], education: ['Tel Aviv University', 'MBA', 'Business', 2014], highlight: 'Launched a telehealth product that reached 40 clinics in its first year.' },
  { name: 'Marco Bianchi', country: 'Italy', city: 'Turin', headline: 'Product Manager, B2B SaaS', years: 5, skills: [['Product management', 5], ['Roadmapping', 4], ['Analytics', 4]], tools: ['Linear', 'Mixpanel', 'Notion'], languages: [['Italian', 'native'], ['English', 'fluent']], workMode: 'remote', availability: 'immediately', employers: [['FactoryOS', 'Product Manager']], education: ['Politecnico di Torino', 'MSc', 'Management Engineering', 2019], highlight: 'Grew weekly active users of a manufacturing SaaS by 3x.' },
  { name: 'Grace Wanjiru', country: 'Kenya', city: 'Nairobi', headline: 'Associate Product Manager', years: 2, skills: [['Product management', 2], ['User research', 2], ['SQL', 1]], tools: ['Jira', 'Figma'], languages: [['English', 'fluent'], ['Swahili', 'native']], workMode: 'hybrid', availability: 'immediately', employers: [['M-Health Kenya', 'Associate PM']], education: ['University of Nairobi', 'BSc', 'Computer Science', 2022], highlight: 'Shipped SMS appointment reminders that cut missed visits by 25%.' },

  // DevOps / cloud
  { name: 'Piotr Kowalski', country: 'Poland', city: 'Warsaw', headline: 'Senior DevOps Engineer', years: 10, skills: [['AWS', 8], ['Kubernetes', 6], ['Terraform', 6], ['Go', 3]], tools: ['ArgoCD', 'Datadog', 'Vault'], languages: [['Polish', 'native'], ['English', 'fluent']], workMode: 'remote', availability: 'immediately', employers: [['CloudBridge', 'Senior DevOps Engineer'], ['Rynek Online', 'SRE']], education: ['Warsaw University of Technology', 'MSc', 'Computer Science', 2014], highlight: 'Cut cloud costs 35% while moving 60 services to EKS.' },
  { name: 'Fatima Diallo', country: 'Senegal', city: 'Dakar', headline: 'Cloud Engineer', years: 4, skills: [['AWS', 4], ['Terraform', 3], ['Linux', 5]], tools: ['Ansible', 'Jenkins', 'Docker'], languages: [['French', 'native'], ['Wolof', 'native'], ['English', 'fluent']], workMode: 'remote', availability: 'notice_period', noticeWeeks: 4, employers: [['Teranga Telecom', 'Cloud Engineer']], education: ['Université Cheikh Anta Diop', 'MSc', 'Networks', 2020], highlight: 'Automated server provisioning for 400 machines with Terraform and Ansible.' },
  { name: 'Erik Johansson', country: 'Norway', city: 'Oslo', headline: 'Site Reliability Engineer', years: 6, skills: [['Kubernetes', 5], ['Go', 4], ['Observability', 5]], tools: ['Prometheus', 'Grafana', 'PagerDuty'], languages: [['Norwegian', 'native'], ['English', 'fluent']], workMode: 'hybrid', availability: 'notice_period', noticeWeeks: 12, employers: [['NordEnergi', 'SRE']], education: ['NTNU', 'MSc', 'Computer Science', 2018], highlight: 'Raised platform availability from 99.5% to 99.95%.', visible: false },

  // Marketing
  { name: 'Julie Moreau', country: 'France', city: 'Paris', headline: 'Growth Marketing Lead', years: 8, skills: [['Growth', 7], ['B2B marketing', 8], ['Analytics', 5], ['SEO', 4]], tools: ['HubSpot', 'Google Analytics', 'Webflow'], languages: [['French', 'native'], ['English', 'fluent']], workMode: 'onsite', availability: 'notice_period', noticeWeeks: 12, employers: [['SaaSFrance', 'Head of Growth'], ['Agence Pulse', 'Marketing Manager']], education: ['ESSEC Business School', 'MSc', 'Marketing', 2016], highlight: 'Tripled inbound B2B pipeline in 18 months.' },
  { name: 'Ahmed Hassan', country: 'Egypt', city: 'Cairo', headline: 'Performance Marketer', years: 5, skills: [['Paid acquisition', 5], ['Analytics', 4], ['Growth', 3]], tools: ['Google Ads', 'Meta Ads', 'Looker Studio'], languages: [['Arabic', 'native'], ['English', 'fluent']], workMode: 'remote', availability: 'immediately', employers: [['ShopNile', 'Performance Marketing Manager']], education: ['Cairo University', 'BCom', 'Marketing', 2019], highlight: 'Managed a €2M yearly ad budget at a 4x return on ad spend.' },
  { name: 'Lucía Fernández', country: 'Spain', city: 'Madrid', headline: 'Content Marketing Manager', years: 4, skills: [['Content strategy', 4], ['SEO', 4], ['Copywriting', 5]], tools: ['WordPress', 'Ahrefs', 'HubSpot'], languages: [['Spanish', 'native'], ['English', 'fluent'], ['French', 'basic']], workMode: 'hybrid', availability: 'immediately', employers: [['Cloudia', 'Content Marketing Manager']], education: ['Universidad Complutense de Madrid', 'BA', 'Journalism', 2020], highlight: 'Grew organic traffic from 10k to 120k monthly visits.' },

  // QA
  { name: 'Nikolai Petrov', country: 'Bulgaria', city: 'Sofia', headline: 'QA Automation Engineer', years: 4, skills: [['Testing', 4], ['Cypress', 3], ['JavaScript', 3]], tools: ['Playwright', 'Postman', 'Jenkins'], languages: [['Bulgarian', 'native'], ['English', 'fluent']], workMode: 'remote', availability: 'immediately', employers: [['TestHive', 'QA Automation Engineer']], education: ['Sofia University', 'BSc', 'Informatics', 2020], highlight: 'Built an end-to-end suite that caught 90% of regressions before release.' },
]

export const testimonials = [
  { name: 'Adaeze Nwosu', role: 'Data Analyst', quote: 'The team introduced me to a company that actually read my profile. Two conversations later I had an offer.' },
  { name: 'Julien Marchand', role: 'CTO, Northstar Labs', quote: 'Searching by real skills and years of experience saved us weeks. Every introduction was relevant.' },
  { name: 'Maja Eriksson', role: 'Product Designer', quote: 'I liked that nobody could contact me without my say. It made applying feel safe.' },
  { name: 'Kofi Boateng', role: 'Head of People, Luma Health', quote: 'The mediated introductions meant candidates arrived informed and genuinely interested.' },
]
