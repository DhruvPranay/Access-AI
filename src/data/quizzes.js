// Knowledge Trials — offline MCQ bank. AI can generate more per track.
// answer = 0-based index of the correct option.

export const TRACKS = [
  { id: 'os', name: 'Operating Systems', group: 'Core CS', icon: '⚙' },
  { id: 'dbms', name: 'DBMS & SQL', group: 'Core CS', icon: '⛁' },
  { id: 'cn', name: 'Computer Networks', group: 'Core CS', icon: '⌁' },
  { id: 'oop', name: 'OOP Concepts', group: 'Core CS', icon: '◈' },
  { id: 'python', name: 'Python', group: 'Languages', icon: 'Py' },
  { id: 'javascript', name: 'JavaScript', group: 'Languages', icon: 'JS' },
  { id: 'java', name: 'Java', group: 'Languages', icon: 'Jv' },
  { id: 'cpp', name: 'C++', group: 'Languages', icon: 'C+' },
  { id: 'c', name: 'C', group: 'Languages', icon: 'C' },
  { id: 'aptitude', name: 'Aptitude & Reasoning', group: 'Placement', icon: '∑' },
];

export const QUIZ_BANK = {
  os: [
    { q: 'Which scheduling algorithm can cause starvation of long processes?', options: ['Round Robin', 'Shortest Job First', 'FCFS', 'None of these'], answer: 1, explanation: 'SJF keeps preferring shorter jobs, so long jobs may wait indefinitely.' },
    { q: 'Which is NOT one of the four Coffman conditions for deadlock?', options: ['Mutual exclusion', 'Hold and wait', 'Preemption', 'Circular wait'], answer: 2, explanation: 'The condition is NO preemption. Allowing preemption breaks deadlock.' },
    { q: "Belady's anomaly can occur with which page replacement algorithm?", options: ['LRU', 'Optimal', 'FIFO', 'LFU'], answer: 2, explanation: 'With FIFO, adding frames can increase page faults. Stack algorithms like LRU/Optimal are immune.' },
    { q: 'Threads of the same process share which of these?', options: ['Stack', 'Registers', 'Program counter', 'Heap memory'], answer: 3, explanation: 'Threads share code, data and heap; each has its own stack, registers and PC.' },
    { q: 'Thrashing occurs when…', options: ['The CPU is idle waiting for I/O', 'Processes spend more time paging than executing', 'Too many threads are created', 'Cache hit ratio is 100%'], answer: 1, explanation: 'Insufficient frames cause constant page faults, collapsing useful work.' },
    { q: "The Banker's algorithm is used for…", options: ['Deadlock detection', 'Deadlock avoidance', 'Deadlock prevention', 'Deadlock recovery'], answer: 1, explanation: 'It only grants requests that keep the system in a safe state — avoidance.' },
    { q: 'A semaphore initialised to 1 used for mutual exclusion is called a…', options: ['Counting semaphore', 'Binary semaphore', 'Monitor', 'Spinlock'], answer: 1, explanation: 'A binary semaphore takes values 0/1 and acts like a mutex.' },
    { q: 'Which memory allocation scheme suffers from external fragmentation?', options: ['Paging', 'Segmentation', 'Both equally', 'Neither'], answer: 1, explanation: 'Variable-size segments leave holes; paging uses fixed frames (internal fragmentation only).' },
  ],
  dbms: [
    { q: 'A relation is in 2NF if it is in 1NF and…', options: ['Has no transitive dependency', 'Has no partial dependency on a candidate key', 'Every determinant is a candidate key', 'Has no multivalued dependency'], answer: 1, explanation: '2NF removes partial dependencies of non-prime attributes on part of a composite key.' },
    { q: 'Which ACID property ensures a committed transaction survives a crash?', options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'], answer: 3, explanation: 'Durability — typically guaranteed through write-ahead logging.' },
    { q: 'What does `SELECT COUNT(col) FROM t` count?', options: ['All rows', 'Non-NULL values in col', 'Distinct values in col', 'NULL values in col'], answer: 1, explanation: 'COUNT(col) skips NULLs; COUNT(*) counts all rows.' },
    { q: 'Which clause filters groups after aggregation?', options: ['WHERE', 'HAVING', 'GROUP BY', 'ORDER BY'], answer: 1, explanation: 'WHERE filters rows before grouping; HAVING filters groups after.' },
    { q: 'A dirty read happens when a transaction…', options: ['Reads data committed by another', 'Reads uncommitted data of another transaction', 'Reads the same row twice with different values', 'Sees new rows appear on re-query'], answer: 1, explanation: 'Reading uncommitted changes that may roll back is a dirty read.' },
    { q: 'Which index structure do most relational databases use by default?', options: ['Hash table', 'B+ tree', 'Binary search tree', 'Trie'], answer: 1, explanation: 'B+ trees support range queries and stay shallow on disk.' },
    { q: 'LEFT JOIN returns…', options: ['Only matching rows', 'All rows from the right table', 'All rows from the left table plus matches', 'The Cartesian product'], answer: 2, explanation: 'Unmatched left rows appear with NULLs for right-side columns.' },
    { q: 'BCNF requires that for every non-trivial FD X → Y…', options: ['Y is a prime attribute', 'X is a superkey', 'X is a primary key', 'Y is a candidate key'], answer: 1, explanation: 'In BCNF every determinant must be a superkey.' },
  ],
  cn: [
    { q: 'At which OSI layer does a router primarily operate?', options: ['Data Link', 'Network', 'Transport', 'Session'], answer: 1, explanation: 'Routers forward packets using IP addresses — layer 3.' },
    { q: 'Which protocol is connectionless?', options: ['TCP', 'UDP', 'HTTP/1.1', 'FTP'], answer: 1, explanation: 'UDP sends datagrams without handshakes or delivery guarantees.' },
    { q: 'How many usable host addresses are in a /26 IPv4 subnet?', options: ['64', '62', '30', '126'], answer: 1, explanation: '2^(32−26) = 64 addresses minus network and broadcast = 62.' },
    { q: 'DNS primarily uses which transport protocol and port for queries?', options: ['TCP 80', 'UDP 53', 'UDP 67', 'TCP 443'], answer: 1, explanation: 'Standard DNS queries use UDP port 53 (TCP for large responses/zone transfers).' },
    { q: 'The TCP three-way handshake sequence is…', options: ['SYN, ACK, FIN', 'SYN, SYN-ACK, ACK', 'ACK, SYN, SYN-ACK', 'SYN, FIN, ACK'], answer: 1, explanation: 'Client SYN → server SYN-ACK → client ACK.' },
    { q: 'ARP maps…', options: ['Domain name → IP', 'IP address → MAC address', 'MAC → port', 'IP → domain name'], answer: 1, explanation: 'ARP resolves a layer-3 IP to a layer-2 MAC on the local network.' },
    { q: 'Which HTTP status code means "Not Modified"?', options: ['200', '301', '304', '404'], answer: 2, explanation: '304 tells the client its cached copy is still valid.' },
  ],
  oop: [
    { q: 'Which OOP principle is demonstrated by method overriding?', options: ['Encapsulation', 'Runtime polymorphism', 'Abstraction', 'Compile-time polymorphism'], answer: 1, explanation: 'Overriding is resolved at runtime via dynamic dispatch.' },
    { q: 'The "L" in SOLID stands for…', options: ['Loose coupling', 'Liskov Substitution Principle', 'Law of Demeter', 'Layered architecture'], answer: 1, explanation: 'Subtypes must be substitutable for their base types without breaking correctness.' },
    { q: 'Which design pattern ensures a class has only one instance?', options: ['Factory', 'Observer', 'Singleton', 'Decorator'], answer: 2, explanation: 'Singleton restricts instantiation to one object with a global access point.' },
    { q: 'Composition is best described as…', options: ['An "is-a" relationship', 'A "has-a" relationship where the part\'s lifetime is tied to the whole', 'Multiple inheritance', 'An interface implementation'], answer: 1, explanation: 'Composition = strong has-a; parts do not outlive the owner.' },
    { q: 'Hiding internal state and exposing behaviour through methods is…', options: ['Inheritance', 'Polymorphism', 'Encapsulation', 'Overloading'], answer: 2, explanation: 'Encapsulation bundles data with methods and restricts direct access.' },
    { q: 'Method overloading is resolved…', options: ['At runtime', 'At compile time', 'By the garbage collector', 'By the linker only'], answer: 1, explanation: 'The compiler picks the overload from the static argument types.' },
  ],
  python: [
    { q: 'What does `print([1, 2, 3][::-1])` output?', options: ['[1, 2, 3]', '[3, 2, 1]', '[3]', 'Error'], answer: 1, explanation: 'A step of −1 slices the list in reverse.' },
    { q: 'What is printed?\n\ndef f(x, acc=[]):\n    acc.append(x)\n    return acc\nf(1)\nprint(f(2))', options: ['[2]', '[1, 2]', '[1]', 'Error'], answer: 1, explanation: 'Default arguments are evaluated once, so the same list is shared across calls.' },
    { q: 'Which is immutable?', options: ['list', 'dict', 'set', 'tuple'], answer: 3, explanation: 'Tuples cannot be modified after creation.' },
    { q: 'What does `print(7 // 2, -7 // 2)` output?', options: ['3 -3', '3 -4', '3.5 -3.5', '4 -4'], answer: 1, explanation: 'Floor division rounds toward negative infinity.' },
    { q: 'What does `print(0.1 + 0.2 == 0.3)` print?', options: ['True', 'False', 'Error', 'None'], answer: 1, explanation: 'Binary floating point makes 0.1 + 0.2 = 0.30000000000000004.' },
    { q: 'The GIL in CPython primarily limits…', options: ['I/O-bound threads', 'Parallel execution of Python bytecode in threads', 'Multiprocessing', 'Async coroutines'], answer: 1, explanation: 'Only one thread executes Python bytecode at a time; use multiprocessing for CPU-bound work.' },
    { q: 'What is `type({})`?', options: ["<class 'set'>", "<class 'dict'>", "<class 'list'>", "<class 'tuple'>"], answer: 1, explanation: '{} is an empty dict; use set() for an empty set.' },
  ],
  javascript: [
    { q: 'What is `typeof null`?', options: ['"null"', '"object"', '"undefined"', '"number"'], answer: 1, explanation: 'A long-standing quirk: typeof null === "object".' },
    { q: 'What does `[1, 2, 3] + [4]` evaluate to?', options: ['[1,2,3,4]', '"1,2,34"', 'NaN', 'Error'], answer: 1, explanation: 'Arrays are converted to strings "1,2,3" and "4" and concatenated.' },
    { q: "Output order?\n\nconsole.log('A');\nsetTimeout(() => console.log('B'), 0);\nPromise.resolve().then(() => console.log('C'));\nconsole.log('D');", options: ['A B C D', 'A D C B', 'A D B C', 'A C D B'], answer: 1, explanation: 'Synchronous logs first, then microtasks (promise), then macrotasks (setTimeout).' },
    { q: 'What does `0.1 * 3 === 0.3` return?', options: ['true', 'false', 'TypeError', 'undefined'], answer: 1, explanation: 'Floating-point: 0.1 * 3 = 0.30000000000000004.' },
    { q: '`let` differs from `var` because `let` is…', options: ['Function-scoped', 'Block-scoped and in the temporal dead zone before declaration', 'Global by default', 'Hoisted with value undefined'], answer: 1, explanation: 'let/const are block scoped and inaccessible before their declaration line.' },
    { q: 'What does `[10, 1, 3].sort()` return?', options: ['[1, 3, 10]', '[10, 1, 3]', '[1, 10, 3]', '[3, 1, 10]'], answer: 2, explanation: 'Default sort compares strings: "1" < "10" < "3".' },
  ],
  java: [
    { q: 'What does `"abc" == new String("abc")` evaluate to?', options: ['true', 'false', 'Compile error', 'Depends on JVM'], answer: 1, explanation: '== compares references; new String creates a distinct object. Use .equals().' },
    { q: 'Which collection does NOT allow duplicate elements?', options: ['ArrayList', 'LinkedList', 'HashSet', 'Vector'], answer: 2, explanation: 'Set implementations reject duplicates.' },
    { q: 'What is the default value of an uninitialised `int` field?', options: ['null', '0', 'Garbage value', 'Compile error'], answer: 1, explanation: 'Instance fields get defaults: 0 for int. (Local variables have no default.)' },
    { q: 'Which keyword prevents a method from being overridden?', options: ['static', 'final', 'private only', 'abstract'], answer: 1, explanation: 'final methods cannot be overridden by subclasses.' },
    { q: 'HashMap in Java 8+ converts a bucket to a tree when…', options: ['Load factor exceeds 0.75', 'A bucket has more than 8 entries (and capacity ≥ 64)', 'Keys are Strings', 'Never'], answer: 1, explanation: 'TREEIFY_THRESHOLD = 8 converts long chains into red-black trees.' },
    { q: 'Which exception is checked?', options: ['NullPointerException', 'ArithmeticException', 'IOException', 'ArrayIndexOutOfBoundsException'], answer: 2, explanation: 'IOException must be declared or caught; the others are RuntimeExceptions.' },
  ],
  cpp: [
    { q: 'What does a virtual destructor in a base class ensure?', options: ['Faster deletion', 'Derived destructor runs when deleting via a base pointer', 'The class cannot be instantiated', 'Copy is disabled'], answer: 1, explanation: 'Without it, deleting a derived object through a base pointer is undefined behaviour.' },
    { q: 'Time complexity of `std::map::find`?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], answer: 1, explanation: 'std::map is a balanced BST (red-black tree).' },
    { q: 'Which smart pointer allows shared ownership?', options: ['unique_ptr', 'shared_ptr', 'weak_ptr', 'auto_ptr'], answer: 1, explanation: 'shared_ptr reference-counts its owners; weak_ptr observes without owning.' },
    { q: 'What is printed?\n\nint x = 5;\nint &r = x;\nr++;\ncout << x;', options: ['5', '6', 'Address of x', 'Compile error'], answer: 1, explanation: 'A reference is an alias; incrementing r increments x.' },
    { q: '`vector::push_back` has amortised complexity…', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], answer: 0, explanation: 'Geometric capacity growth makes the average cost constant.' },
    { q: 'Which is true about `const int* p`?', options: ['p cannot be reassigned', 'The int pointed to cannot be modified through p', 'Both', 'Neither'], answer: 1, explanation: 'Pointer to const int; `int* const p` would be a const pointer.' },
  ],
  c: [
    { q: 'What is `sizeof(char)` in C?', options: ['Depends on platform', 'Always 1', '2', '4'], answer: 1, explanation: 'The standard defines sizeof(char) as 1 byte.' },
    { q: 'What does `printf("%d", 5 / 2);` print?', options: ['2.5', '2', '3', 'Undefined'], answer: 1, explanation: 'Integer division truncates toward zero.' },
    { q: 'Which function allocates zero-initialised memory?', options: ['malloc', 'calloc', 'realloc', 'alloca'], answer: 1, explanation: 'calloc(n, size) zeroes the allocated block.' },
    { q: 'What does `int a[5]; a[5] = 1;` cause?', options: ['Compile error', 'Undefined behaviour', 'Array grows', 'Runtime exception always'], answer: 1, explanation: 'Out-of-bounds writes are undefined behaviour — no bounds checking in C.' },
    { q: 'A `static` local variable…', options: ['Is re-initialised each call', 'Retains its value between calls', 'Is allocated on the heap', 'Is visible to other files'], answer: 1, explanation: 'Static locals have static storage duration and are initialised once.' },
  ],
  aptitude: [
    { q: 'A train 150 m long passes a pole in 10 s. Its speed in km/h is…', options: ['15', '54', '45', '60'], answer: 1, explanation: '15 m/s × 18/5 = 54 km/h.' },
    { q: 'If 6 workers finish a job in 12 days, how many days do 9 workers take?', options: ['6', '8', '9', '18'], answer: 1, explanation: 'Work = 72 worker-days; 72 / 9 = 8.' },
    { q: 'Next in the series: 2, 6, 12, 20, 30, ?', options: ['40', '42', '44', '36'], answer: 1, explanation: 'n(n+1): 6×7 = 42.' },
    { q: 'A price rises 20% then falls 20%. Net change?', options: ['0%', '4% decrease', '4% increase', '2% decrease'], answer: 1, explanation: '1.2 × 0.8 = 0.96 → 4% decrease.' },
    { q: 'Probability of getting at least one head in 3 fair coin tosses?', options: ['1/2', '3/4', '7/8', '1/8'], answer: 2, explanation: '1 − (1/2)^3 = 7/8.' },
    { q: 'How many ways can the letters of "LEVEL" be arranged?', options: ['120', '60', '30', '20'], answer: 2, explanation: '5! / (2!·2!) = 30 (two L, two E).' },
  ],
};

export function localQuiz(trackId, count = 5) {
  const bank = QUIZ_BANK[trackId] || [];
  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
