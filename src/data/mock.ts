
export interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  verified: boolean;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  image: string;
  attendees: number;
  price: string;
  description: string;
  tags: string[];
}

export interface Squad {
  id: string;
  name: string;
  eventId: string;
  members: User[];
}

export const CURRENT_USER: User = {
  id: "u1",
  name: "Alex R.",
  handle: "@alex_raves",
  avatar: "https://images.unsplash.com/photo-1729375874763-45ddfc9feec1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  verified: true,
};

export const USERS: User[] = [
  CURRENT_USER,
  {
    id: "u2",
    name: "Sarah K.",
    handle: "@sarah_vibes",
    avatar: "https://images.unsplash.com/photo-1770732165497-ccd5066f0bdf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    verified: true,
  },
  {
    id: "u3",
    name: "Mike T.",
    handle: "@techno_mike",
    avatar: "https://images.unsplash.com/photo-1578300253266-dedd2cd40912?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    verified: false,
  },
];

export const EVENTS: Event[] = [
  {
    id: "e1",
    title: "Neon Dreams Festival",
    date: "OCT 14 • 9:00 PM",
    location: "Brooklyn Mirage, NY",
    image: "https://images.unsplash.com/photo-1578300253266-dedd2cd40912?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjeWJlcnB1bmslMjByYXZlJTIwY3Jvd2QlMjBuZW9ufGVufDF8fHx8MTc3MTAwNzI1NXww&ixlib=rb-4.1.0&q=80&w=1080",
    attendees: 1240,
    price: "$85",
    description: "The ultimate cyberpunk experience. 3 stages of techno, house, and drum & bass. Immerse yourself in a world of neon lights and heavy bass.",
    tags: ["Techno", "Rave", "Outdoor"],
  },
  {
    id: "e2",
    title: "Electric Sky 2026",
    date: "NOV 02 • 4:00 PM",
    location: "Speedway, Las Vegas",
    image: "https://images.unsplash.com/photo-1765974215826-de7ad3fc7847?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvdXRkb29yJTIwcmF2ZSUyMGZlc3RpdmFsJTIwbmVvbnxlbnwxfHx8fDE3NzEwMDcyNjZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    attendees: 5400,
    price: "$120",
    description: "Under the electric sky, we unite. The biggest festival of the season returns with a lineup that will blow your mind.",
    tags: ["EDM", "Festival", "Camping"],
  },
  {
    id: "e3",
    title: "Warehouse Project: Exhale",
    date: "OCT 21 • 10:00 PM",
    location: "Depot Mayfield, Manchester",
    image: "https://images.unsplash.com/photo-1676969609758-b3bdfe8e0b53?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobm8lMjBkaiUyMG5lb258ZW58MXx8fHwxNzcxMDA3MjYzfDA&ixlib=rb-4.1.0&q=80&w=1080",
    attendees: 850,
    price: "$45",
    description: "Raw, industrial, and heavy. Exhale brings the hardest techno beats to the legendary Depot Mayfield.",
    tags: ["Hard Techno", "Industrial", "Indoor"],
  },
  {
    id: "r1",
    title: "Afterlife: Tale of Us",
    date: "NOV 10 • 11:00 PM",
    location: "Avant Gardner, NY",
    image: "https://images.unsplash.com/photo-1666682115302-a767a7b585f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    attendees: 3200,
    price: "$95",
    description: "Experience the realm of consciousness. Tale of Us brings their signature melodic techno sound to Brooklyn.",
    tags: ["Melodic Techno", "Visuals", "Immersive"],
  },
  {
    id: "r2",
    title: "Laserface: Gareth Emery",
    date: "DEC 05 • 8:00 PM",
    location: "Bill Graham Civic, SF",
    image: "https://images.unsplash.com/photo-1574154894072-18ba0d48321b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    attendees: 5000,
    price: "$75",
    description: "The world's greatest laser show returns. Perfect synchronization of lasers and trance music.",
    tags: ["Trance", "Lasers", "Arena"],
  },
];

export const SQUADS: Squad[] = [
  {
    id: "s1",
    name: "Techno Vikings",
    eventId: "e1",
    members: [USERS[0], USERS[1]],
  },
];
