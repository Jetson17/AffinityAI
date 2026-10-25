const bcrypt = require('bcryptjs');
const db = require('./db');

/**
 * Seed script to populate database with demonstration users and friendships.
 * Run via: node server/database/seed.js [--force]
 *
 * Safeguards:
 * - Destructive reset requires explicit --force or { force: true } if data exists.
 * - Destructive seeding is blocked in production unless ALLOW_PRODUCTION_SEED=true.
 */
function seedDatabase(options = {}) {
    const isProd = process.env.NODE_ENV === 'production';
    const isTest = process.env.NODE_ENV === 'test';
    const forceFlag = options.force || process.argv.includes('--force') || process.env.FORCE_SEED === 'true' || isTest;

    if (isProd && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
        throw new Error('Destructive seeding is strictly prohibited in production environment.');
    }

    // Check if database already has users
    const existingUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
    if (existingUsers > 0 && !forceFlag) {
        console.log(`ℹ️ Database already contains ${existingUsers} users. Destructive reset skipped.`);
        console.log('   Pass --force to command line or { force: true } to explicitly reset demo data.');
        return false;
    }

    console.log('🌱 Seeding database for Friend Recommendation System...');

    // Clean existing tables in reverse dependency order
    db.prepare('DELETE FROM messages').run();
    db.prepare('DELETE FROM friendships').run();
    db.prepare('DELETE FROM friend_requests').run();
    db.prepare('DELETE FROM users').run();

    // Reset autoincrement sequence
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('users', 'friend_requests', 'friendships', 'messages')").run();

    const hashedPassword = bcrypt.hashSync('password123', 10);

    const demoUsers = [
        {
            name: 'Alice Johnson',
            email: 'alice@demo.com',
            bio: 'CS Sophomore @ Tech University. Passionate about Graph Algorithms & Full-Stack Development. [Demo Account]',
            interests: 'Graph Theory, Algorithms, Web Development, Full-Stack, React',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
            role: 'user'
        },
        {
            name: 'Bob Smith',
            email: 'bob@demo.com',
            bio: 'Robotics & AI Enthusiast. Love solving competitive programming puzzles. [Demo Account]',
            interests: 'Robotics, AI, Machine Learning, Competitive Programming, Algorithms',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            role: 'user'
        },
        {
            name: 'Charlie Brown',
            email: 'charlie@demo.com',
            bio: 'UI/UX Designer & Frontend Specialist. Coffee lover & open-source contributor. [Demo Account]',
            interests: 'UI/UX, Frontend, Web Development, Mobile',
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
            role: 'user'
        },
        {
            name: 'David Wilson',
            email: 'david@demo.com',
            bio: 'Math nerd & backend developer. Researching distributed systems and graph theory. [Demo Account]',
            interests: 'Distributed Systems, Graph Theory, Backend, Math, Algorithms',
            avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
            role: 'user'
        },
        {
            name: 'Emma Watson',
            email: 'emma@demo.com',
            bio: 'Data Science major. Working on machine learning recommender systems. [Demo Account]',
            interests: 'Data Science, Machine Learning, AI, Python',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            role: 'user'
        },
        {
            name: 'Frank Miller',
            email: 'frank@demo.com',
            bio: 'Cybersecurity student. Ethical hacking, CTFs and network topology analysis. [Demo Account]',
            interests: 'Cybersecurity, Ethical Hacking, CTF, Systems',
            avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
            role: 'user'
        },
        {
            name: 'Grace Hopper',
            email: 'grace@demo.com',
            bio: 'Compiler design and low-level systems enthusiast. Compiler Club lead. [Demo Account]',
            interests: 'Compilers, Systems, Algorithms, Low-Level',
            avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
            role: 'user'
        },
        {
            name: 'Henry Cavill',
            email: 'henry@demo.com',
            bio: 'Mobile App Developer (Flutter/React Native). Gamer and tech reviewer. [Demo Account]',
            interests: 'Mobile, Flutter, React, Frontend',
            avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
            role: 'user'
        },
        {
            name: 'Admin User',
            email: 'admin@demo.com',
            bio: 'System Administrator for AffinityAI Discovery Platform. [System Administrator]',
            interests: 'Systems, Cybersecurity, Distributed Systems',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
            role: 'admin'
        }
    ];

    const insertUser = db.prepare(`
        INSERT INTO users (name, email, password, bio, interests, avatar, role)
        VALUES (@name, @email, @password, @bio, @interests, @avatar, @role)
    `);

    demoUsers.forEach(u => {
        insertUser.run({ ...u, password: hashedPassword });
    });

    console.log(`✅ Inserted ${demoUsers.length} demo users.`);

    // Helper to insert canonical friendship
    const insertFriendship = db.prepare(`
        INSERT INTO friendships (user1_id, user2_id)
        VALUES (?, ?)
    `);

    const addFriend = (idA, idB) => {
        const u1 = Math.min(idA, idB);
        const u2 = Math.max(idA, idB);
        insertFriendship.run(u1, u2);
    };

    // Friendships:
    // 1: Alice, 2: Bob, 3: Charlie, 4: David, 5: Emma, 6: Frank, 7: Grace, 8: Henry
    addFriend(1, 2); // Alice - Bob
    addFriend(1, 3); // Alice - Charlie
    addFriend(1, 4); // Alice - David

    addFriend(2, 3); // Bob - Charlie
    addFriend(2, 5); // Bob - Emma

    addFriend(3, 5); // Charlie - Emma
    addFriend(3, 6); // Charlie - Frank

    addFriend(4, 7); // David - Grace

    addFriend(5, 6); // Emma - Frank
    addFriend(5, 8); // Emma - Henry

    addFriend(6, 7); // Frank - Grace

    console.log('✅ Created initial friendships network.');

    // Add friend requests:
    // Frank (6) sent a pending request to Alice (1)
    // Alice (1) sent a pending request to Henry (8)
    const insertRequest = db.prepare(`
        INSERT INTO friend_requests (sender_id, receiver_id, status)
        VALUES (?, ?, ?)
    `);

    insertRequest.run(6, 1, 'pending'); // Incoming request for Alice from Frank
    insertRequest.run(1, 8, 'pending'); // Outgoing request from Alice to Henry

    console.log('✅ Created demonstration friend requests.');

    // Add initial messages between friends
    const insertMessage = db.prepare(`
        INSERT INTO messages (sender_id, receiver_id, content, created_at)
        VALUES (?, ?, ?, ?)
    `);

    const now = new Date();
    const minAgo = (m) => new Date(now.getTime() - m * 60000).toISOString();

    // Alice (1) & Bob (2)
    insertMessage.run(2, 1, "Hey Alice! Are you ready for the DSA micro-project presentation?", minAgo(30));
    insertMessage.run(1, 2, "Hey Bob! Yes, reviewing Kruskal's MST and Kahn's topological sort right now.", minAgo(25));
    insertMessage.run(2, 1, "Great! The mutual-friends recommendation graph looks super neat.", minAgo(20));

    // Alice (1) & Charlie (3)
    insertMessage.run(3, 1, "Hi Alice, let me know if you want feedback on the frontend design!", minAgo(15));
    insertMessage.run(1, 3, "Thanks Charlie, the purple-blue palette and cards turned out great!", minAgo(10));

    console.log('✅ Created demonstration chat messages.');
    console.log('🎉 Database seeding completed successfully!');
}

if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;
