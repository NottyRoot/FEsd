/* =========================================================================
   MMIT Portfolio Hub — Content Data (Static)
   เก็บเฉพาะเนื้อหาโปรเจกต์ที่เป็นข้อมูลจริง: ชื่องาน, โจทย์, Persona, UX Flow
   ตัวเลขทั้งหมด (ไลค์ / คะแนนเฉลี่ย / ฟีดแบ็ก) ไม่ได้อยู่ไฟล์นี้
   เพราะดึงมาจาก Firestore แบบ real-time — ไม่มีข้อมูลปลอม hardcode แล้ว
   NOTE: ต้องถูกโหลดก่อน store.js และ app.js เสมอ
   ========================================================================= */

        // =========================================================================
        // DATA STORE: MMIT Showcase Projects & UX Case Studies
        // =========================================================================
        const categories = [
            { id: 'all', label: 'ทั้งหมด', icon: 'fa-cubes' },
            { id: 'webapp', label: 'Web / App UX', icon: 'fa-laptop-code' },
            { id: '3d', label: '3D & Animation', icon: 'fa-cube' },
            { id: 'game', label: 'Game Dev', icon: 'fa-gamepad' },
            { id: 'research', label: 'UX Research', icon: 'fa-microscope' }
        ];

        const projectsData = [
            {
                id: 'proj-1',
                title: 'MMIT Campus Transit & Smart Map',
                category: 'webapp',
                categoryLabel: 'Web / App UX',
                team: 'Team DigitalPulse (MMIT66)',
                year: '2026',
                thumbnail: 'https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=800&q=80',
                tagline: 'แอปพลิเคชันค้นหาเส้นทางรถรับส่งในมหาวิทยาลัยด้วยข้อมูล GPS Real-time พร้อม UI รองรับโหมดประหยัดพลังงาน',
                techStack: ['React', 'Tailwind CSS', 'Leaflet.js', 'Node.js'],
                problem: 'นักศึกษามักพลาดรถรับส่งเนื่องจากไม่ทราบเวลามาถึงที่แน่นอน และหน้าจอแผนที่เดิมใช้งานยากบนอุปกรณ์มือถือกลางแจ้ง',
                solution: 'ออกแบบ UI การแสดงผลแผนที่แบบ Minimal High-contrast ปรับปรุง User Flow ให้แตะเพียง 2 ครั้งก็ทราบเวลารถมาถึง',
                keyFeatures: [
                    'Live GPS Tracking การเดินทางของรถไฟฟ้า',
                    'High Contrast Mode มองเห็นชัดเจนกลางแดด',
                    'Micro-animation แจ้งเตือนเมื่อรถใกล้อยู่ในระยะ 200m',
                    'รองรับ PWA ใช้งานได้แม้สัญญาณอินเทอร์เน็ตต่ำ'
                ],
                persona: {
                    name: 'น้องเมย์ (นักศึกษาปี 1)',
                    role: 'ผู้ใช้งานประจำวัน',
                    quote: 'อยากรู้วิธีเดินทางไปตึกเรียนให้เร็วที่สุด โดยไม่ต้องยืนรอรถกลางแดดนานๆ',
                    avatar: 'M',
                    details: 'ต้องรีบเดินทางระหว่างตึกเรียนที่มีระยะห่างกัน และมีเวลาพักเปลี่ยนคาบเพียง 10 นาที'
                },
                userFlow: ['เปิดแอปพลิเคชัน', 'ตรวจตำแหน่งปัจจุบันอัตโนมัติ', 'เลือกตึกปลายทาง', 'แสดงเวลาและตำแหน่งรถที่เร็วที่สุด'],
                beforeUX: [
                    'ต้องซูมขยายแผนที่ด้วยสองมือ ลำบากเมื่อถือของ',
                    'ตัวหนังสือเล็กเกินไป และไม่มีการแสดงผลสถานะ Real-time',
                    'ขั้นตอนเยอะ 5-6 คลิกกว่าจะเจอสายรถ'
                ],
                afterUX: [
                    'ปุ่มขนาดใหญ่ (Touch Target > 48px) กดง่ายด้วยมือเดียว',
                    'การ์ดสรุปสายรถที่ใกล้ที่สุดลอยขึ้นมาอัตโนมัติ',
                    'ลดขั้นตอนเหลือเพียง 2 คลิก'
                ]
            },
            {
                id: 'proj-2',
                title: 'Cyberpunk Metamorphosis 3D Showcase',
                category: '3d',
                categoryLabel: '3D & Animation',
                team: 'VFX & Craft Studio',
                year: '2025',
                thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
                tagline: 'ภาพยนตร์สั้นแอนิเมชัน 3D ผสมผสานศิลปวัฒนธรรมไทยเข้ากับสไตล์ Cyberpunk แบบอนาคต',
                techStack: ['Blender', 'Unreal Engine 5', 'Substance Painter', 'DaVinci Resolve'],
                problem: 'การแสดงผลชิ้นงาน 3D บนเว็บมักมีปัญหาโหลดช้า และมุมกล้องเดิมๆ ไม่สร้างประสบการณ์ร่วมให้กับผู้ชม',
                solution: 'จัดทำระบบ Interactive 3D Web Viewer ให้ผู้เข้าชมหมุนซูมดู Lighting และ Wireframe ของโมเดลได้แบบเรียลไทม์',
                keyFeatures: [
                    'Real-time Lighting Switch (Day / Cyber Neon Night)',
                    'Interactive Shader & Texture Breakdown Visualizer',
                    'Smooth Camera Transition Points',
                    'Optimization Render Scale สำหรับอุปกรณ์เคลื่อนที่'
                ],
                persona: {
                    name: 'คุณกิตติ (Art Director)',
                    role: 'กรรมการประเมินผลงาน',
                    quote: 'อยากเห็นกระบวนการปั้นโมเดลและ Lighting Detail เชิงลึก ไม่ใช่แค่ภาพนิ่ง rendering',
                    avatar: 'K',
                    details: 'ผู้เชี่ยวชาญด้านองค์ประกอบศิลป์ ต้องการตรวจเช็กความละเอียดของ Topology และ Texture Maps'
                },
                userFlow: ['เข้าชมหน้า 3D Hub', 'เลือกรอบการแสดงโหมด แสง/เงา', 'คลิกจุด Hotspot บนโมเดลเพื่อดูรายละเอียด', 'สลับมุมกล้อง Cinematic'],
                beforeUX: [
                    'วิดีโอตัวอย่างโหลดช้าเนื่องจากไฟล์ขนาดใหญ่เกินไป',
                    'ไม่สามารถโต้ตอบหรือหมุนดูมุมมองที่สนใจเองได้'
                ],
                afterUX: [
                    'โหลดเร็วด้วยการทำ WebGL Asset Optimization',
                    'ผู้ใช้หมุนกล้อง 360 องศาได้อิสระพร้อมข้อมูลสเปกโมเดล'
                ]
            },
            {
                id: 'proj-3',
                title: 'Aura: Mental Health VR & Game Companion',
                category: 'game',
                categoryLabel: 'Game Dev',
                team: 'MMIT Interactive Lab',
                year: '2026',
                thumbnail: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80',
                tagline: 'เกมบำบัดอารมณ์และฝึกสมาธิผ่านภาพบรรยากาศแฟนตาซี พร้อมระบบตอบสนองด้วยเสียงเพลงบรรเลงตามจังหวะหายใจ',
                techStack: ['Unity', 'C#', 'Web Audio API', 'Figma'],
                problem: 'แอปสุขภาพจิตส่วนใหญ่มุ่งเน้นการจดบันทึกข้อความ ซึ่งสร้างความเครียดหรือความน่าเบื่อให้กับผู้ใช้งานบางกลุ่ม',
                solution: 'ใช้องค์ประกอบของเกม (Gamification) ผสาน Soundscape ผ่อนคลาย เพื่อเปลี่ยนการทำสมาธิให้กลายเป็นการผจญภัยที่น่าหลงใหล',
                keyFeatures: [
                    'Dynamic Audio Environment ปรับเปลี่ยนตามจังหวะการกด',
                    'Soft Color Palette ป้องกันสายตาล้า',
                    'Micro-interactions ตอบสนองตอบทุกการสัมผัสแบบ Haptic Feedback',
                    'ไม่มีการแข่งขันหรือการนับเวลาถอยหลังเพื่อลดแรงกดดัน'
                ],
                persona: {
                    name: 'เอก (นักศึกษาช่วงเตรียมสอบ)',
                    role: 'ผู้ต้องการผ่อนคลายความเครียด',
                    quote: 'ต้องการพื้นที่พักผ่อนสมอง 5 นาที โดยไม่ต้องอ่านข้อความยาวๆ',
                    avatar: 'A',
                    details: 'มีภาวะเครียดสะสมจากการเรียน ต้องการแอปที่ให้ความรู้สึกสงบตั้งแต่หน้าแรก'
                },
                userFlow: ['สวมหูฟังและเปิดเกม', 'เลือกสภาวะอารมณ์ในปัจจุบัน', 'ทำภารกิจการเดินทางของละอองแสง', 'สรุปสภาวะอารมณ์หลังเล่น'],
                beforeUX: [
                    'เมนูซับซ้อน มีข้อความอธิบายกติกายาวเกินไป',
                    'สีสันฉูดฉาดทำให้แสบตาเมื่อเล่นในห้องมืด'
                ],
                afterUX: [
                    'ออกแบบ UI ด้วยสไตล์ Neumorphism นุ่มนวลสบายตา',
                    'การสอนเล่นแบบ Onboarding ผ่านการปฏิบัติจริงโดยไม่ต้องอ่าน'
                ]
            },
            {
                id: 'proj-4',
                title: 'Elderly Accessibility Redesign Study',
                category: 'research',
                categoryLabel: 'UX Research',
                team: 'UX Masters Team',
                year: '2025',
                thumbnail: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=800&q=80',
                tagline: 'การศึกษาวิจัยและออกแบบการโต้ตอบดิจิทัลสำหรับผู้สูงอายุ เพื่อเพิ่มความสามารถในการเข้าถึงบริการภาครัฐ',
                techStack: ['Figma', 'Maze Testing', 'Miro', 'WCAG 2.1 Guidelines'],
                problem: 'ผู้สูงอายุมักทำรายการผิดพลาดหรือกดยกเลิกกลางคันเนื่องจากขนาดปุ่มเล็ก ข้อความไม่ชัดเจน และไอคอนสื่อความหมายไม่ตรงกัน',
                solution: 'สร้าง Design System เฉพาะผู้สูงวัย ปรับขนาด Touch Target, ใช้ Contrast Ratio 7:1 และเพิ่มระบบยืนยันแบบ Voice Confirm',
                keyFeatures: [
                    'Large Touch Target (ขั้นต่ำ 56x56 px)',
                    'Icon + Plain Text Label ทุกจุดปฏิสัมพันธ์',
                    'Voice feedback อ่านออกเสียงสรุปรายการ',
                    'Undo Bar ช่วยดึงข้อมูลคืนได้ง่ายเมื่อกดผิด'
                ],
                persona: {
                    name: 'คุณป้าสมศรี (อายุ 64 ปี)',
                    role: 'ผู้สูงวัยใช้อินเทอร์เน็ต',
                    quote: 'ตัวหนังสือเล็กอ่านยาก กลัวกดผิดแล้วเงินหาย หรือทำธุรกรรมค้างไว้',
                    avatar: 'S',
                    details: 'มีปัญหาเรื่องสายตายาว และใช้นิ้วแตะหน้าจอด้วยความแรงไม่สม่ำเสมอ'
                },
                userFlow: ['เข้าสู่ระบบด้วยหมายเลขโทรศัพท์', 'เลือกบริการด้วยไอคอนขนาดใหญ่', 'ตรวจสอบรายการสรุปอ่านง่าย', 'กดยืนยันพร้อมเสียงตอบรับ'],
                beforeUX: [
                    'ใช้ไอคอนเดี่ยวๆ โดยไม่มีข้อความกำกับ ทำให้ผู้สูงอายุสับสน',
                    'สีข้อความจางเกินไป ลำบากในการอ่าน'
                ],
                afterUX: [
                    'ผ่านมาตรฐาน WCAG AAA ข้อความเด่นชัด อ่านง่าย',
                    'ผู้สูงอายุทดลองใช้งานและทำรายการสำเร็จเพิ่มขึ้น 85%'
                ]
            },
            {
                id: 'proj-5',
                title: 'EcoTrack: Carbon Footprint Web App',
                category: 'webapp',
                categoryLabel: 'Web / App UX',
                team: 'Green Tech MMIT',
                year: '2026',
                thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
                tagline: 'เว็บแอปพลิเคชันคำนวณและลดการสร้างคาร์บอนฟุตพริ้นท์ในชีวิตประจำวัน พร้อมระบบ Dashboard Visualizer ลื่นไหล',
                techStack: ['Vue.js', 'Chart.js', 'Tailwind CSS', 'Firebase'],
                problem: 'การคำนวณคาร์บอนส่วนใหญ่มักเป็นแบบฟอร์มคณิตศาสตร์ที่น่าเบื่อและเข้าใจยาก',
                solution: 'เปลี่ยนตัวเลขการปล่อยคาร์บอนให้กลายเป็นภาพป่าไม้ที่เจริญเติบโตหรือเหี่ยวเฉาตามพฤติกรรมจริงของผู้ใช้',
                keyFeatures: [
                    'Interactive Data Chart แสดงผลด้วยอนิเมชัน Smooth Scale',
                    'Gamified Daily Challenges เก็บแต้มปลูกต้นไม้จริง',
                    'Quick Add Widget บันทึกกิจกรรมใน 3 วินาที',
                    'Dark/Light Mode ปรับตามช่วงเวลาอัตโนมัติ'
                ],
                persona: {
                    name: 'ท็อป (สายกรีน Gen Z)',
                    role: 'คนรุ่นใหม่ใส่ใจสิ่งแวดล้อม',
                    quote: 'อยากรู้ว่ากิจกรรมในแต่ละวันของตัวเองส่งผลต่อโลกมากน้อยแค่ไหนแบบเข้าใจง่าย',
                    avatar: 'T',
                    details: 'ชอบดูสถิติในรูปแบบ Infographic สวยงาม และแบ่งปันลง Social Media'
                },
                userFlow: ['เปิดหน้าแดชบอร์ด', 'กด + เพื่อเพิ่มกิจกรรม', 'เลือกประเภท (เดินทาง/อาหาร)', 'ดูผลกระทบต่อป่าไม้เสมือนจริง'],
                beforeUX: [
                    'กรอกแบบฟอร์มหลายขั้นตอน ตัวเลขวิเคราะห์หนาแน่นเกินไป',
                    'ไม่มีแรงจูงใจให้กลับมาใช้งานซ้ำ'
                ],
                afterUX: [
                    ' Dashboard สวยงาม เข้าใจง่ายภายใน 5 วินาที',
                    'การ์ดสรุปผลสามารถกด Share ลง Story ได้สวยงาม'
                ]
            },
            {
                id: 'proj-6',
                title: 'Mythical Thai Heritage AR Experience',
                category: '3d',
                categoryLabel: '3D & Animation',
                team: 'Heritage Interactive',
                year: '2025',
                thumbnail: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
                tagline: 'แอปพลิเคชัน AR ส่องสำรวจวรรณคดีไทย นำเสนอตัวละครสถาปัตยกรรมแบบ 3D มีชีวิตบนโลกจริง',
                techStack: ['Three.js', 'AR.js', 'WebXR', 'Blender'],
                problem: 'พิพิธภัณฑ์และวรรณคดีเดิมๆ ขาดความน่าสนใจสำหรับเด็กและเยาวชนรุ่นใหม่',
                solution: 'นำเทคโนโลยี WebAR มาใช้โดยไม่ต้องดาวน์โหลดแอปเพิ่ม สามารถส่องกล้องผ่านเว็บบราวเซอร์เพื่อรับชมการแสดง 3D ได้ทันที',
                keyFeatures: [
                    'Zero-install WebAR ประสบการณ์ไร้รอยต่อ',
                    'Interactive Audio Storytelling เสียงพากย์ระดับมืออาชีพ',
                    'Gesture Control หมุน ย่อ ขยาย โมเดลด้วยนิ้วมือ',
                    'Photo Mode ถ่ายรูปคู่กับตัวละคร 3D'
                ],
                persona: {
                    name: 'คุณครูฟ้า (ครูสอนวิชาภาษาไทย)',
                    role: 'ผู้นำเทคโนโลยีไปใช้ในการสอน',
                    quote: 'อยากให้นักเรียนตื่นเต้นกับวรรณคดีไทยผ่านสื่อใหม่ๆ ที่เห็นภาพชัดเจน',
                    avatar: 'F',
                    details: 'ต้องการสื่อการสอนที่ใช้งานง่าย ไม่ยุ่งยากกับการติดตั้งแอปพลิเคชันลงเครื่องนักเรียน'
                },
                userFlow: ['สแกน QR Code ที่ใบงาน', 'เปิดหน้า WebAR ในบราวเซอร์', 'ส่องกล้องไปที่รูปภาพ', 'โมเดล 3D ปรากฏพร้อมเสียงบรรยาย'],
                beforeUX: [
                    'ต้องดาวน์โหลดแอปขนาดใหญ่กว่า 200MB ก่อนใช้งาน',
                    'การจดจำ Marker ช้า โมเดลกระตุก'
                ],
                afterUX: [
                    'สแกนปุ๊บ เล่นได้ปั๊บ ภายในเวลาไม่ถึง 3 วินาที',
                    'การแสดงผลโมเดลลื่นไหลด้วย WebXR Framework'
                ]
            }
        ];

        // Feedbacks Data Store (เก็บเป็น timestamp เพื่อให้แสดงเวลาย้อนหลังได้จริง)
        let userFeedbacks = [];   // เติมจาก Firestore ตอนรัน — ไม่มีข้อมูลตัวอย่างปลอมแล้ว

        // App State
        const DEFAULT_RATING = 5;
        const MAX_AUTHOR_LEN = 60;
        const MAX_COMMENT_LEN = 500;

        let currentCategory = 'all';
        let currentSearchQuery = '';
        let currentViewMode = 'grid'; // 'grid' | 'list'
        let activeModalProject = null;
        let isDrawerOpen = false;
        let lastFocusedElement = null; // เก็บโฟกัสไว้คืนหลังปิด modal
