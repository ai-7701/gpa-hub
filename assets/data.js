/* ============================================================
   GPA HUB — EDIT THIS FILE TO UPDATE YOUR DATA
   Everything the site shows is calculated from the values here.
   The record below is DEMO DATA — replace it with your own.
   ============================================================ */

const PROFILE = {
  name: "Sample Student",
  display: "Sample Student",
  prn: "000000000",
  programme: "BTech",
  school: "School of Computing and Data Science",
  university: "Your University",
  transcriptDate: "—"
};

/* Grade scale, exactly as printed on the transcript rules page */
const GRADE_SCALE = [
  { g: "O",  p: 10, d: "Outstanding" },
  { g: "A+", p: 9,  d: "Excellent" },
  { g: "A",  p: 8,  d: "Very Good" },
  { g: "B+", p: 7,  d: "Good" },
  { g: "B",  p: 6,  d: "Above Average" },
  { g: "C",  p: 5,  d: "Average" },
  { g: "P",  p: 4,  d: "Pass" },
  { g: "F",  p: 0,  d: "Fail" },
  { g: "I",  p: 0,  d: "Incomplete" },
  { g: "AU", p: 0,  d: "Audit" },
  { g: "AB", p: 0,  d: "Absent" },
  { g: "W",  p: 0,  d: "Withdrawn" }
];

/* Add a semester by copying one block and editing it. */
const SEMESTERS = [
  {
    label: "Semester 1",
    year: "20XX-XX",
    courses: [
      { code: "CS101",   name: "Introduction to Programming",        credits: 4, grade: "A+" },
      { code: "CS101L",  name: "Introduction to Programming Lab",    credits: 2, grade: "A"  },
      { code: "IDC101",  name: "Writing and Communication",          credits: 4, grade: "B+" },
      { code: "MATH101", name: "Calculus",                           credits: 4, grade: "A"  },
      { code: "PHY101",  name: "Physics for Engineers",              credits: 3, grade: "B"  }
    ]
  },
  {
    label: "Semester 2",
    year: "20XX-XX",
    courses: [
      { code: "CS105",   name: "Programming in Python",              credits: 4, grade: "A+" },
      { code: "CS106L",  name: "Python and Data Structures Lab",     credits: 2, grade: "A"  },
      { code: "CS203",   name: "Introduction to Data Structures",    credits: 4, grade: "O"  },
      { code: "IDC103",  name: "Environment and Sustainability",     credits: 4, grade: "A+" },
      { code: "MATH102", name: "Discrete Mathematics",               credits: 4, grade: "A"  }
    ]
  }
];

/* Study resources — edit freely, add as many groups as you like */
const RESOURCES = [
  {
    title: "Coding & DSA",
    items: [
      { name: "NeetCode 150",        url: "https://neetcode.io/practice",        note: "Curated DSA problem list with video solutions" },
      { name: "LeetCode",            url: "https://leetcode.com/problemset/",    note: "Daily practice, topic-wise filters" },
      { name: "VisuAlgo",            url: "https://visualgo.net/en",             note: "See sorting, trees and graphs animate" },
      { name: "GeeksforGeeks — DSA", url: "https://www.geeksforgeeks.org/dsa-tutorial-learn-data-structures-and-algorithms/", note: "Reference notes for every topic" },
      { name: "Python Docs",         url: "https://docs.python.org/3/tutorial/", note: "Official tutorial and standard library" },
      { name: "CS50x",               url: "https://cs50.harvard.edu/x/",         note: "Harvard's intro to CS, free" }
    ]
  },
  {
    title: "Mathematics",
    items: [
      { name: "MIT 6.042J",          url: "https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/", note: "Discrete maths for CS, full lectures" },
      { name: "Khan Academy Calculus", url: "https://www.khanacademy.org/math/calculus-1", note: "Limits, derivatives, integrals from scratch" },
      { name: "Paul's Math Notes",   url: "https://tutorial.math.lamar.edu/",    note: "Cheat-sheet style calculus notes" },
      { name: "3Blue1Brown",         url: "https://www.3blue1brown.com/topics/calculus", note: "Visual intuition before formulas" },
      { name: "NPTEL",               url: "https://nptel.ac.in/courses",         note: "Free IIT / IISc courses with certificates" }
    ]
  },
  {
    title: "Tools & Habits",
    items: [
      { name: "Desmos",              url: "https://www.desmos.com/calculator",   note: "Plot anything before an exam" },
      { name: "Overleaf",            url: "https://www.overleaf.com/",           note: "LaTeX for reports and assignments" },
      { name: "Anki",                url: "https://apps.ankiweb.net/",           note: "Spaced repetition for definitions" },
      { name: "Pomofocus",           url: "https://pomofocus.io/",               note: "25-minute focus timer" }
    ]
  }
];
