import { deriveSearchQueriesFromResume } from '../utils/queryGenerator';
import { MasterResume } from '@sentinel/types';

describe('Dynamic Candidate Target Profile & Algorithmic Search Query Generator Test Suite', () => {
  const flutterResume: MasterResume = {
    fullName: 'Flutter Developer Candidate',
    email: 'flutter@test.com',
    phone: '+1234567890',
    location: 'Remote',
    linkedIn: 'https://linkedin.com/in/flutterdev',
    github: 'https://github.com/flutterdev',
    portfolio: 'https://flutterdev.com',
    summary: 'Senior Flutter Developer specializing in cross-platform mobile apps.',
    experience: [
      {
        role: 'Flutter Developer',
        company: 'MobileCorp',
        location: 'Remote',
        startDate: '2021-01-01',
        endDate: 'Present',
        highlights: ['Built mobile apps with Flutter and Dart.'],
        technologiesUsed: ['Flutter', 'Dart'],
      },
    ],
    skills: {
      languages: ['Dart'],
      frameworks: ['Flutter'],
      databases: ['SQLite'],
      tools: ['Git', 'VS Code'],
      cloudAndDevOps: ['Firebase'],
    },
    education: [],
    certifications: [],
    projects: [],
  };

  const backendResume: MasterResume = {
    fullName: 'Backend Engineer Candidate',
    email: 'backend@test.com',
    phone: '+1234567890',
    location: 'Remote',
    linkedIn: 'https://linkedin.com/in/backenddev',
    github: 'https://github.com/backenddev',
    portfolio: 'https://backenddev.com',
    summary: 'Backend Engineer specializing in Python, Node.js, and Django API microservices.',
    experience: [
      {
        role: 'Backend Developer',
        company: 'ServerCorp',
        location: 'Remote',
        startDate: '2019-01-01',
        endDate: 'Present',
        highlights: ['Designed Python Django microservices and Node.js APIs.'],
        technologiesUsed: ['Python', 'Node.js', 'Django'],
      },
    ],
    skills: {
      languages: ['Python', 'JavaScript'],
      frameworks: ['Node.js', 'Django', 'Express'],
      databases: ['PostgreSQL', 'Redis'],
      tools: ['Docker', 'Git'],
      cloudAndDevOps: ['AWS'],
    },
    education: [],
    certifications: [],
    projects: [],
  };

  const androidResume: MasterResume = {
    fullName: 'Android Engineer Candidate',
    email: 'android@test.com',
    phone: '+1234567890',
    location: 'Remote',
    linkedIn: 'https://linkedin.com/in/androiddev',
    github: 'https://github.com/androiddev',
    portfolio: 'https://androiddev.com',
    summary: 'Native Android Developer building Kotlin apps.',
    experience: [
      {
        role: 'Android Developer',
        company: 'DroidApp',
        location: 'Remote',
        startDate: '2020-01-01',
        endDate: 'Present',
        highlights: ['Native Android app development.'],
        technologiesUsed: ['Kotlin', 'Android SDK'],
      },
    ],
    skills: {
      languages: ['Kotlin', 'Java'],
      frameworks: ['Android SDK', 'Jetpack Compose'],
      databases: ['Room'],
      tools: ['Android Studio'],
      cloudAndDevOps: [],
    },
    education: [],
    certifications: [],
    projects: [],
  };

  const iosResume: MasterResume = {
    fullName: 'iOS Engineer Candidate',
    email: 'ios@test.com',
    phone: '+1234567890',
    location: 'Remote',
    linkedIn: 'https://linkedin.com/in/iosdev',
    github: 'https://github.com/iosdev',
    portfolio: 'https://iosdev.com',
    summary: 'Native iOS Developer building Swift apps.',
    experience: [
      {
        role: 'iOS Developer',
        company: 'AppleApp',
        location: 'Remote',
        startDate: '2020-01-01',
        endDate: 'Present',
        highlights: ['Native iOS app development.'],
        technologiesUsed: ['Swift', 'UIKit'],
      },
    ],
    skills: {
      languages: ['Swift', 'Objective-C'],
      frameworks: ['UIKit', 'SwiftUI'],
      databases: ['CoreData'],
      tools: ['Xcode'],
      cloudAndDevOps: [],
    },
    education: [],
    certifications: [],
    projects: [],
  };

  const dataResume: MasterResume = {
    fullName: 'Data Engineer Candidate',
    email: 'data@test.com',
    phone: '+1234567890',
    location: 'Remote',
    linkedIn: 'https://linkedin.com/in/datadev',
    github: 'https://github.com/datadev',
    portfolio: 'https://datadev.com',
    summary: 'Data Engineer building PySpark & Snowflake ETL pipelines.',
    experience: [
      {
        role: 'Data Engineer',
        company: 'BigDataCorp',
        location: 'Remote',
        startDate: '2019-06-01',
        endDate: 'Present',
        highlights: ['ETL pipelines with PySpark and Snowflake.'],
        technologiesUsed: ['Spark', 'Snowflake', 'Python'],
      },
    ],
    skills: {
      languages: ['Python', 'SQL'],
      frameworks: ['Spark', 'Snowflake', 'Airflow'],
      databases: ['Snowflake', 'PostgreSQL'],
      tools: ['Git', 'dbt'],
      cloudAndDevOps: ['AWS Glue'],
    },
    education: [],
    certifications: [],
    projects: [],
  };

  test('1. Flutter resume generates Flutter/mobile queries and NO Backend or Data Engineer queries', () => {
    const derived = deriveSearchQueriesFromResume(flutterResume);
    const keywords = derived.keywords;

    expect(keywords).toContain('Flutter Developer');
    expect(keywords).toContain('Flutter Engineer');
    expect(keywords).toContain('Dart Developer');

    // Negative assertions
    expect(keywords.some((k) => k.includes('Backend'))).toBe(false);
    expect(keywords.some((k) => k.includes('Django'))).toBe(false);
    expect(keywords.some((k) => k.includes('Data Engineer'))).toBe(false);
    expect(keywords.some((k) => k.includes('Spark'))).toBe(false);
  });

  test('2. Backend resume generates Backend/Node/Python queries and NO Flutter queries', () => {
    const derived = deriveSearchQueriesFromResume(backendResume);
    const keywords = derived.keywords;

    expect(keywords).toContain('Backend Developer');
    expect(keywords).toContain('Backend Engineer');
    expect(keywords).toContain('Node.js Developer');
    expect(keywords).toContain('Python Developer');

    // Negative assertions
    expect(keywords.some((k) => k.includes('Flutter'))).toBe(false);
    expect(keywords.some((k) => k.includes('Dart'))).toBe(false);
    expect(keywords.some((k) => k.includes('Data Engineer'))).toBe(false);
  });

  test('3. Android resume generates Android/Kotlin queries and NO Flutter queries', () => {
    const derived = deriveSearchQueriesFromResume(androidResume);
    const keywords = derived.keywords;

    expect(keywords).toContain('Android Developer');
    expect(keywords).toContain('Android Engineer');
    expect(keywords).toContain('Kotlin Developer');

    // Negative assertions
    expect(keywords.some((k) => k.includes('Flutter'))).toBe(false);
    expect(keywords.some((k) => k.includes('Dart'))).toBe(false);
    expect(keywords.some((k) => k.includes('Django'))).toBe(false);
  });

  test('4. iOS resume generates iOS/Swift queries and NO Flutter queries', () => {
    const derived = deriveSearchQueriesFromResume(iosResume);
    const keywords = derived.keywords;

    expect(keywords).toContain('iOS Developer');
    expect(keywords).toContain('iOS Engineer');
    expect(keywords).toContain('Swift Developer');

    // Negative assertions
    expect(keywords.some((k) => k.includes('Flutter'))).toBe(false);
    expect(keywords.some((k) => k.includes('Dart'))).toBe(false);
    expect(keywords.some((k) => k.includes('Backend'))).toBe(false);
  });

  test('5. Data Engineer resume generates Data Engineering queries and NO Flutter/Mobile queries', () => {
    const derived = deriveSearchQueriesFromResume(dataResume);
    const keywords = derived.keywords;

    expect(keywords).toContain('Data Engineer');
    expect(keywords).toContain('Spark Engineer');
    expect(keywords).toContain('Snowflake Engineer');

    // Negative assertions
    expect(keywords.some((k) => k.includes('Flutter'))).toBe(false);
    expect(keywords.some((k) => k.includes('Mobile'))).toBe(false);
    expect(keywords.some((k) => k.includes('iOS'))).toBe(false);
  });

  test('6. WORLDWIDE mode with empty user query uses ONLY resume-derived queries', () => {
    const derived = deriveSearchQueriesFromResume(flutterResume, undefined);

    expect(derived.userQuery).toBeUndefined();
    expect(derived.keywords.length).toBeGreaterThan(0);
    expect(derived.keywords).toContain('Flutter Developer');
  });

  test('7. WORLDWIDE mode with null/empty resume fails safely with empty keywords', () => {
    const derived = deriveSearchQueriesFromResume(null, undefined);

    expect(derived.userQuery).toBeUndefined();
    expect(derived.keywords.length).toBe(0);
  });

  test('8. CUSTOM mode with "android" preserves explicit user intent and does not overwrite userQuery', () => {
    const derived = deriveSearchQueriesFromResume(flutterResume, 'android');

    expect(derived.userQuery).toBe('android');
    expect(derived.keywords).toEqual(['android']);
  });
});
