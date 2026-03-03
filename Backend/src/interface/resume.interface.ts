interface Profile {
    network: String,
    username: String,
    url: String,
}

interface Location {
    address: String,
    postalCode: String,
    city: String,
    countryCode: String,
    region: String,
}

interface Basics {
    name: String,
    label: String,
    email: String,
    phone: String,
    summary: String,
    location: Location,
    profiles: Profile[],
    totalExperience: String,
}

interface Work {
    name: String,
    position: String,
    startDate: String,
    endDate: String,
    summary: String,
    highlights: [String],
    keywords: [String],
    url: String,
    roles: [String],
    entity: String,
    type: String,
}

interface Education {
    institution: String,
    area: String,
    studyType: String,
    startDate: String,
    endDate: String,
    gpa: String,
    courses: [String],
}

interface Skill {
    name: String,
    level: String,
    keywords: [String],
}

interface Project {
    name: String,
    description: String,
    highlights: [String],
    keywords: [String],
    startDate: String,
    endDate: String,
    url: String,
    roles: [String],
    entity: String,
    type: String,
}

interface Award {
    title: String,
    date: String,
    awarder: String,
    summary: String,
}
interface Certificate {
    name: String,
    date: String,
    issuer: String,
    url: String,
}

interface Meta {
    version: String,
}

export interface IBaseResume {
    basics: Basics,
    work: Work[],
    education: Education[],
    skills: Skill[],
    projects: Project[],
    awards: Award[],
    certificates: Certificate[],
    meta: Meta,
}