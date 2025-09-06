import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { motion } from "framer-motion";
import emailjs from "@emailjs/browser";


/*
  Single-page App (all sections on one page) with
  - Holographic aurora background (kept)
  - Smooth-scroll anchor nav
  - Interactive 3D hero (Three.js) that responds to cursor
  - All original sections (Home, About, Projects, Skills, Contact)
  - Personalized contact confirmation
  - Performance-minded (cleanup, resize handling, limited particles)

  Paste this as App.jsx. Requires:
    npm install three framer-motion
  Tailwind or equivalent CSS expected for classes used.
*/

const cn = (...cls) => cls.filter(Boolean).join(" ");

/* ------------------------- Aurora Background ------------------------- */
function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-black" />
      <div className="absolute -inset-[12%] blur-2xl opacity-55 mix-blend-screen">
        <div className="aurora aurora-a" />
        <div className="aurora aurora-b" />
      </div>

      {/* Simple floating orbs (cheap) */}
      <div className="absolute inset-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="absolute rounded-full" style={{ top: `${(i * 17) % 90}%`, left: `${(i * 23) % 90}%`, width: 88, height: 88, background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.02), transparent 40%), linear-gradient(135deg, rgba(168,85,247,0.12), rgba(16,185,129,0.09))`, filter: 'blur(22px)', mixBlendMode: 'screen', opacity: 0.7 }} />
        ))}
      </div>

      <style>{`
        .aurora{position:absolute;inset:0;background:conic-gradient(from 0deg at 50% 50%, rgba(0,255,255,0.22), rgba(255,0,255,0.18), rgba(0,255,200,0.18), rgba(0,120,255,0.18));}
        .aurora-a{animation:auroraMove 28s linear infinite}
        .aurora-b{animation:auroraMove 36s linear infinite reverse;mix-blend:screen}
        @keyframes auroraMove{0%{transform:translate3d(-6%,0,0) rotate(0deg)}50%{transform:translate3d(6%,0,0) rotate(180deg)}100%{transform:translate3d(-6%,0,0) rotate(360deg)}}
        html{scroll-behavior:smooth}
      `}</style>
    </div>
  );
}

/* ------------------------- Navbar (anchors) ------------------------- */
function Navbar() {
  const items = [
    { id: "home", label: "Home" },
    { id: "about", label: "About" },
    { id: "projects", label: "Projects" },
    { id: "skills", label: "Skills" },
    { id: "contact", label: "Contact" },
  ];

  return (
    <header className="fixed top-4 left-4 right-4 z-50">
      <div className="mx-auto max-w-7xl px-4">
        <nav className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.28)]">
          <a href="#home" className="inline-flex items-center gap-3">
            <img src="/images/Logo.png" alt="Logo" className="w-14 h-10 rounded-md object-cover" />
            <span className="text-white font-semibold">Fatima Butt</span>
          </a>

          <div className="hidden md:flex items-center gap-3">
            {items.map((it) => (
              <a key={it.id} href={`#${it.id}`} className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm uppercase tracking-wide text-white/90 hover:scale-[1.02] transition">
                <span className="absolute inset-0 bg-white/4 rounded-full" />
                <span className="relative z-10">{it.label}</span>
              </a>
            ))}
          </div>

          <div className="md:hidden">
            <details className="text-white">
              <summary className="cursor-pointer px-3 py-2 rounded-md bg-white/6">Menu</summary>
              <div className="mt-2 flex flex-col gap-2 p-3 rounded-md bg-white/4 backdrop-blur">
                {items.map((it) => (
                  <a key={it.id} href={`#${it.id}`} className="py-2 px-3 rounded-md">{it.label}</a>
                ))}
              </div>
            </details>
          </div>
        </nav>
      </div>
    </header>
  );
}

/* ------------------------- 3D Hero (Three.js) ------------------------- */
function Hero3D({ colorA = 0xff66c4, colorB = 0x26e3ff }) {
  const mountRef = useRef();
  const requestRef = useRef();
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene + Camera
    const scene = new THREE.Scene();
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 0, 6);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.outputEncoding = THREE.sRGBEncoding;
    mount.appendChild(renderer.domElement);

    // Lights
    const amb = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(amb);
    const pLight = new THREE.PointLight(0xffffff, 0.8);
    pLight.position.set(5, 5, 5);
    scene.add(pLight);

    // Geometry: stylized rounded box (using BoxGeometry + bevel via shader is heavy), so create grouped shapes
    const group = new THREE.Group();

    // Core cube
    const geo = new THREE.BoxGeometry(2, 2, 2);
    const mat = new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.2, color: colorA });
    const cube = new THREE.Mesh(geo, mat);
    cube.castShadow = true;
    group.add(cube);

    // Wireframe outline
    const geo2 = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(geo2, new THREE.LineBasicMaterial({ color: colorB, linewidth: 2 }));
    group.add(line);

    // Floating smaller orbs
    const orbMat = new THREE.MeshStandardMaterial({ color: colorB, roughness: 0.1, metalness: 0.6 });
    const orbs = [];
    for (let i = 0; i < 5; i++) {
      const s = 0.18 + Math.random() * 0.25;
      const m = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 16), orbMat);
      const angle = (i / 5) * Math.PI * 2;
      m.position.set(Math.cos(angle) * (2.6 + Math.random() * 0.6), Math.sin(angle) * (1.4 + Math.random() * 0.6), (Math.random() - 0.5) * 1.6);
      scene.add(m);
      orbs.push(m);
    }

    scene.add(group);

    // Animation loop
    let last = Date.now();
    const animate = () => {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;

      // Smooth target rotation based on mouse
      const tx = (mouseRef.current.x / mount.clientWidth) * 2 - 1; // -1..1
      const ty = (mouseRef.current.y / mount.clientHeight) * 2 - 1;
      // apply gentle rotation target
      group.rotation.y += (tx * 0.6 - group.rotation.y) * (0.06 + dt * 0.3);
      group.rotation.x += (-ty * 0.4 - group.rotation.x) * (0.06 + dt * 0.3);

      // slow auto-rotate
      group.rotation.y += 0.01 * dt * 60 * 0.02;

      // orbs float
      orbs.forEach((o, i) => {
        o.position.y += Math.sin(now / 800 + i) * 0.0008 * 60;
      });

      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);

    // Handle mouse move
    const onMove = (e) => {
      const rect = mount.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };
    mount.addEventListener("pointermove", onMove);

    // Resize
    const onResize = () => {
      const w2 = mount.clientWidth;
      const h2 = mount.clientHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    window.addEventListener("resize", onResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(requestRef.current);
      mount.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      // dispose geometries and materials
      geo.dispose();
      geo2.dispose();
      mat.dispose();
      orbMat.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [colorA, colorB]);

  return (
    <div ref={mountRef} className="w-full h-96 md:h-[520px] rounded-2xl overflow-hidden" style={{ willChange: "transform" }} />
  );
}

/* ------------------------- Page layout pieces ------------------------- */
function PageContainer({ id, children }) {
  return (
    <section id={id} className="relative mx-auto mt-28 max-w-7xl px-6 py-12">
      {children}
    </section>
  );
}

function SectionTitle({ eyebrow, title, desc }) {
  return (
    <div className="mb-8">
      {eyebrow && <p className="text-xs uppercase tracking-[0.3em] text-white/60">{eyebrow}</p>}
      <h2 className="mt-2 bg-gradient-to-r from-fuchsia-300 via-cyan-200 to-indigo-200 bg-clip-text text-3xl font-extrabold text-transparent md:text-5xl">{title}</h2>
      {desc && <p className="mt-3 max-w-2xl text-white/80">{desc}</p>}
    </div>
  );
}

/* ------------------------- Sections (Home, About, ...) ------------------------- */
function HomeSection() {
  return (
    <PageContainer id="home">
      <div className="grid items-center gap-8 md:grid-cols-2">
        {/* Text Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08 }}
        >
          <p className="text-sm uppercase tracking-[0.35em] text-white/60">
            Aspiring Software Engineer
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-white md:text-6xl">
            Fatima builds{" "}
            <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
              joyful
            </span>{" "}
            web experiences.
          </h1>
          <p className="mt-4 max-w-xl text-white/80">
            Web Developer (Wix + HTML/CSS/JS) learning MERN. 200+ DSA problems.
            Focused on performance, UX, and animations.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#projects"
              className="rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-5 py-2 font-semibold text-white shadow-[0_8px_26px_rgba(0,200,255,.28)] hover:scale-[1.02] transition"
            >
              Explore Projects
            </a>
            <a
              href="#contact"
              className="rounded-full border border-white/20 bg-white/8 px-5 py-2 font-semibold text-white/90 backdrop-blur hover:bg-white/20 transition"
            >
              Contact
            </a>
          </div>
        </motion.div>

        {/* Image Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative"
        >
          <div className="relative aspect-square w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl mx-auto overflow-hidden">
            {/* Gradient Box / Background */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-fuchsia-500/30 via-cyan-400/20 to-indigo-500/30" />
            
            
            <img
              src="/images/Me.png"
              alt="Fatima"
              className="absolute inset-0 h-full w-full object-cover rounded-2xl z-10"
            />
          </div>
        </motion.div>
      </div>
    </PageContainer>
  );
}



function AboutSection() {
  const timeline = [
  { year: "2023–2027", title: "BSCS — Govt. University, Lahore", body: "Current CGPA 3.1 | Deepening CS & Advanced Calculus" },
  { year: "2024", title: "Frontend Focus", body: "Responsive sites with Wix + HTML/CSS/JS" },
  { year: "2025", title: "MERN Journey", body: "Building full-stack apps, authentication & REST APIs" },
  { 
    year: "July–August 2025", 
    title: "QA Intern — eCare Solutions", 
    body: "Contributed to QA by reporting & documenting bugs, testing APIs with Postman, creating bug reports, and exploring Angular (To-Do List, Weather App). Also researched Meta WhatsApp Business API integration limitations." 
  },
];

  return (
    <PageContainer id="about">
      <SectionTitle eyebrow="Who Am I" title="Crafting delightful, performant UIs" desc="I merge aesthetics with logic — animations that serve usability." />
      <div className="grid gap-10 md:grid-cols-[1.1fr,0.9fr]">
        <div>
          <ol className="relative border-l border-white/10 pl-6">
            {timeline.map((t, i) => (
              <li key={t.year} className="mb-8">
                <div className="absolute -left-[11px] mt-1 w-4 h-4 rounded-full bg-gradient-to-br from-fuchsia-400 to-cyan-400 shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
                <h4 className="text-white font-semibold">{t.title}</h4>
                <p className="text-xs uppercase tracking-widest text-white/60">{t.year}</p>
                <p className="mt-2 text-white/80">{t.body}</p>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <div className="group relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="text-xl font-bold text-white">What I love</h3>
            <ul className="mt-3 space-y-2 text-white/85">
              <li>⚡ Micro‑interactions that make UI feel alive</li>
              <li>🎨 Design systems, glassmorphism & vibrant gradients</li>
              <li>🧠 DSA mindset for performant code</li>
            </ul>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm text-white/80">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">Wix</div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">Tailwind</div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">React</div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">Node</div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">Mongo</div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">C++ / OOP</div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function ProjectsSection() {
  const list = useMemo(() => [
    { title: "Portfolio (Bootstrap)", desc: "Responsive portfolio website.", tech: ["Bootstrap", "HTML", "CSS"], code: "https://github.com/Fatimabutt786/My-portfolio-using-bootstrap", img: "/images/portfolio.webp" },
    { title: "Rock‑Paper‑Scissors (C++)", desc: "Console game with clean logic.", tech: ["C++", "OOP"], code: "https://github.com/Fatimabutt786/Rock-paper-scissor-game-in-c-", img: "/images/Rock.jpg" },
    { title: "Random Joke Generator", desc: "Fetch jokes, playful UI.", tech: ["JavaScript"], code: "https://github.com/Fatimabutt786/Random-joke-generator", img: "/images/joke.jpg" },
    { title: "Music_Player (Java)", desc: "OOP‑based library manager.", tech: ["Java", "OOP"], code: "https://github.com/Fatimabutt786/Music_Player", img: "/images/music.webp" },
    { title: "MERN Real‑Estate", desc: "Listings, auth, Firebase hosting.", tech: ["Mongo", "Express", "React", "Node", "Firebase"], code: "https://github.com/Fatimabutt786/Mern-Real-Estate", img: "/images/mern estate.jpg" },
    { title: "Prescripto — Doctor Booking App", desc: "Book appointments and manage schedules.", tech: ["React", "Node", "Mongo", "Express", "Tailwind"], code: "https://github.com/Fatimabutt786/Prescripto", img: "/images/presc.png" },
  ], []);

  return (
    <PageContainer id="projects">
      <SectionTitle eyebrow="My Projects" title="Projects with playful polish" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p, i) => (
          <article key={p.title} className="">
            <div className="group">
              <img src={p.img} alt={p.title} className="aspect-video w-full rounded-xl object-cover" />
              <h3 className="mt-4 text-white text-lg font-semibold">{p.title}</h3>
              <p className="mt-1 text-white/80">{p.desc}</p>
              <div className="mt-3 flex flex-wrap gap-2">{p.tech.map((t) => <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">{t}</span>)}</div>
              <div className="mt-4 flex gap-3"><a href={p.code} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/90 hover:bg-white/10">Code</a></div>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-10 text-center">
        <a href="https://github.com/Fatimabutt786" target="_blank" rel="noreferrer" className="inline-block rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-8 py-3 text-white font-semibold shadow-lg hover:scale-105 transition">Visit My GitHub 🚀</a>
      </div>
    </PageContainer>
  );
}

function SkillsSection() {
  const skills = [
    { name: "HTML/CSS", v: 95 }, { name: "JavaScript", v: 85 }, { name: "Wix", v: 90 }, { name: "React", v: 80 }, { name: "C++ (OOP/DSA)", v: 88 }, { name: "Python", v: 70 },
  ];
  return (
    <PageContainer id="skills">
      <SectionTitle title="Skills with motion" desc="A curated set of tools and technologies I rely on daily to craft interactive, high-performance, and visually engaging web experiences." />
      <div className="grid gap-6 md:grid-cols-2">
        {skills.map((s, i) => (
          <div key={s.name} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between"><span className="text-white font-medium">{s.name}</span><span className="text-white/70">{s.v}%</span></div>
            <div className="h-3 w-full rounded-full bg-white/10"><div style={{ width: `${s.v}%` }} className="h-3 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 transition-all duration-1000" /></div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}



function ContactSection() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [error, setError] = useState("");
  const [sentMsg, setSentMsg] = useState("");
  const [isSending, setIsSending] = useState(false); // New: to prevent multiple clicks

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.email || !formData.message) {
      setError("⚠️ Please fill in all the required fields.");
      return;
    }
    setError("");
    setIsSending(true); // disable button during send

    emailjs.send(
      "service_4gw5ozw",
      "template_dlk692o",
      formData,
      "MiBcVlx2PtuyWZ0L9"
    )
      .then((response) => {
        console.log("SUCCESS!", response.status, response.text);
        setSentMsg(`✅ Hey ${formData.name.split(" ")[0]}, we got your message — we'll get back to you soon!`);
        setFormData({ name: "", email: "", message: "" });
        setTimeout(() => setSentMsg(""), 7000);
      })
      .catch((err) => {
        console.log("FAILED...", err);
        setError("❌ Something went wrong. Please try again.");
      })
      .finally(() => {
        setIsSending(false); // enable button again
      });
  };

  return (
    <section id="contact" className="relative mx-auto mt-28 max-w-7xl px-6 py-12">
      {/* Section Title */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Say Salaam</p>
        <h2 className="mt-2 bg-gradient-to-r from-fuchsia-300 via-cyan-200 to-indigo-200 bg-clip-text text-3xl font-extrabold text-transparent md:text-5xl">
          Let’s build something joyful
        </h2>
        <p className="mt-3 max-w-2xl text-white/80">
          I’m open to freelance and internships. Drop a message, and I’ll get back to you soon!
        </p>
      </div>

      {/* Grid: Form + Quick Links */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Contact Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
        >
          <label className="block text-sm text-white/80">Name</label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your name"
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          />

          <label className="mt-4 block text-sm text-white/80">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />

          <label className="mt-4 block text-sm text-white/80">Message</label>
          <textarea
            rows={5}
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Write your message..."
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {error && <p className="mt-3 text-red-400 text-sm font-medium">{error}</p>}

          <button
            type="submit"
            disabled={isSending}
            className={`mt-5 w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(0,200,255,.35)] transition
              ${isSending ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02]"}`}
          >
            {isSending ? "Sending..." : "Send Message"}
          </button>

          {sentMsg && <p className="mt-3 text-center text-emerald-300 font-medium">{sentMsg}</p>}
        </form>

        {/* Quick Links */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h3 className="text-white text-2xl font-bold mb-4">Quick Links</h3>
          <ul className="flex flex-col gap-3">
            <li className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-fuchsia-500/8 to-cyan-400/8">
              📧 <a href="mailto:fatimabutt2k23@gmail.com" className="text-white">fatimabutt2k23@gmail.com</a>
            </li>
            <li className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-fuchsia-500/8 to-cyan-400/8">
              📍 Lahore, Pakistan
            </li>
            <li className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-fuchsia-500/8 to-cyan-400/8">
              🔗 <a href="https://www.linkedin.com/in/fatima-shahzad-bb31a529b/" target="_blank" rel="noreferrer" className="text-white">LinkedIn</a>
            </li>
            <li className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-fuchsia-500/8 to-cyan-400/8">
              💻 <a href="https://github.com/Fatimabutt786" target="_blank" rel="noreferrer" className="text-white">GitHub</a>
            </li>
            <li className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-fuchsia-500/8 to-cyan-400/8">
              📄 <a href="/images/Fatima Butt.pdf" target="_blank" rel="noreferrer" className="text-white">Resume</a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}




/* ------------------------- Footer ------------------------- */
function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-10 text-center text-white/60">
        <div className="mb-2 flex justify-center gap-4">
          <a href="mailto:fatimabutt2k23@gmail.com" className="hover:text-white">Email</a>
          <a href="https://www.linkedin.com/in/fatima-shahzad-bb31a529b/" target="_blank" rel="noreferrer" className="hover:text-white">LinkedIn</a>
          <a href="https://github.com/Fatimabutt786" className="hover:text-white">GitHub</a>
        </div>
        <p> © {new Date().getFullYear()} Fatima Butt</p>
      </div>
    </footer>
  );
}

/* ------------------------- App ------------------------- */
export default function App() {
  return (
    <div className="min-h-screen text-white selection:bg-fuchsia-500/30 selection:text-fuchsia-50 bg-black">
      <AuroraBackground />
      <Navbar />

      <main>
        <HomeSection />
        <AboutSection />
        <ProjectsSection />
        <SkillsSection />
        <ContactSection />
      </main>

      <Footer />
    </div>
  );
}
