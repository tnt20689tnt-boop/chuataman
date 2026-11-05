import { useEffect, useRef, useState } from "react";
import { HAIR_COLORS, HAIR_LABEL, OUTFIT_COLORS, OUTFIT_LABEL, PHAP_THOAI, TAM_KINH, ZONES, quoteOfDay, type Hair, type Outfit } from "./sim";
import { input, loadAvatar, saveAvatar, setUI, teleport, useUI, type Avatar } from "./store";
import { ringBell, speak, stopSpeak } from "./audio";
import { connectMultiplayer, useMultiplayer } from "./multiplayer";

function Lotus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <g fill="currentColor">
        <path d="M32 8c6 8 8 18 0 30-8-12-6-22 0-30z" />
        <path d="M10 22c10 0 18 6 21 17-11 1-19-6-21-17z" opacity=".85" />
        <path d="M54 22c-10 0-18 6-21 17 11 1 19-6 21-17z" opacity=".85" />
        <path d="M4 38c10-3 20 0 27 4-9 6-20 5-27-4z" opacity=".7" />
        <path d="M60 38c-10-3-20 0-27 4 9 6 20 5 27-4z" opacity=".7" />
        <rect x="14" y="48" width="36" height="3" rx="1.5" opacity=".6" />
      </g>
    </svg>
  );
}

export function Hud() {
  const avatar = useUI((s) => s.avatar);
  const panel = useUI((s) => s.panel);
  const action = useUI((s) => s.action);
  const zone = useUI((s) => s.zoneLabel);
  const ready = useUI((s) => s.sceneReady);
  const multiplayer = useMultiplayer();

  useEffect(() => {
    const a = loadAvatar();
    if (a) setUI({ avatar: a });
    else setUI({ panel: "avatar" });
    const disconnect = connectMultiplayer();
    return disconnect;
  }, []);

  const doAction = (a: "le" | "chap" | "thien" | "kinh") => {
    if (action === a) {
      stopSpeak();
      setUI({ action: "none", pose: "stand" });
      return;
    }
    stopSpeak();
    if (a === "le") {
      setUI({ action: "le", pose: "kneel" });
      ringBell(0.35);
    } else if (a === "chap") setUI({ action: "chap", pose: "pray" });
    else if (a === "thien") {
      setUI({ action: "thien", pose: "sit" });
      ringBell(0.45);
    } else {
      const z = ZONES.find((x) => x.id === "dien")!;
      teleport(z.x + 4, z.z + 6, z.rot);
      setUI({ action: "kinh", pose: "sit" });
      speak(TAM_KINH, () => setUI({ action: "none", pose: "stand" }));
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none" data-scene-ready={ready ? "" : undefined}>
      {/* brand */}
      <header className="hud-glass pointer-events-auto absolute left-3 top-3 flex items-center gap-3 px-4 py-2.5 sm:left-5 sm:top-5">
        <Lotus className="h-9 w-9 text-primary" />
        <div>
          <div className="font-display text-lg leading-tight tracking-wide text-foreground sm:text-xl">CHÙA TÂM AN</div>
          <div className="hidden text-xs italic text-muted-foreground sm:block">An yên trong tâm – Hạnh phúc trong đời</div>
        </div>
      </header>

      <div className="absolute right-3 top-3 flex flex-col items-end gap-2 sm:right-5 sm:top-5">
        <div className="hud-glass pointer-events-auto flex items-center gap-2 px-3 py-1.5 text-xs text-foreground">
          <span className={`h-2 w-2 rounded-full ${multiplayer.connected ? "bg-success" : "bg-muted-foreground"}`} />
          <span>Đang trực tuyến: <b>{multiplayer.connected ? multiplayer.players.length + 1 : "—"}</b>{multiplayer.connected ? " (có bạn)" : " · chưa kết nối"}</span>
        </div>
        <div className="hud-glass px-3 py-1.5 text-xs text-muted-foreground">
          1.000 Phật tử trình diễn · không tính trực tuyến
        </div>
        <div className="hud-chip">📍 {zone}</div>
      </div>

      {/* side tools */}
      <nav className="pointer-events-auto absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-2 sm:right-5">
        <SideBtn label="Phật pháp" icon="☸" onClick={() => setUI({ panel: panel === "phap" ? null : "phap" })} />
        <SideBtn label="Cầu nguyện" icon="🪷" onClick={() => setUI({ panel: panel === "pray" ? null : "pray" })} />
        <SideBtn label="Giao lưu" icon="💬" onClick={() => setUI({ panel: panel === "chat" ? null : "chat" })} />
        <SideBtn label="Chuông" icon="🔔" onClick={() => ringBell(0.6)} />
        <SideBtn label="Avatar" icon="🧘" onClick={() => setUI({ panel: "avatar" })} />
      </nav>

      {/* action bar */}
      <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 sm:bottom-6 sm:gap-3">
        <ActBtn icon="🙏" label="Lễ Phật" active={action === "le"} onClick={() => doAction("le")} />
        <ActBtn icon="🤲" label="Chắp tay" active={action === "chap"} onClick={() => doAction("chap")} />
        <ActBtn icon="🧘" label="Ngồi thiền" active={action === "thien"} onClick={() => doAction("thien")} />
        <ActBtn icon="📿" label="Nghe kinh" active={action === "kinh"} onClick={() => doAction("kinh")} />
        <ActBtn icon="🧭" label="Tham quan" active={panel === "tour"} onClick={() => setUI({ panel: panel === "tour" ? null : "tour" })} />
      </div>

      <div className="absolute bottom-28 left-1/2 hidden -translate-x-1/2 text-xs text-muted-foreground md:block">
        <span className="hud-chip">WASD / phím mũi tên để đi · Shift chạy · kéo chuột xoay · cuộn để phóng to</span>
      </div>

      <Joystick />

      {action === "thien" && <MeditationOverlay />}
      {action === "kinh" && <SutraOverlay />}
      {panel === "tour" && <TourPanel />}
      {panel === "phap" && <PhapPanel />}
      {panel === "pray" && <PrayPanel />}
      {panel === "chat" && <ChatPanel name={avatar?.name ?? "Phật tử"} />}
      {panel === "avatar" && <AvatarPanel initial={avatar} />}
    </div>
  );
}

function SideBtn({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button className="hud-side" onClick={onClick} title={label} aria-label={label}>
      <span className="text-lg">{icon}</span>
      <span className="hidden text-[10px] sm:block">{label}</span>
    </button>
  );
}

function ActBtn({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className="hud-action" data-active={active} onClick={onClick}>
      <span className="text-xl sm:text-2xl">{icon}</span>
      <span className="text-[10px] font-semibold sm:text-xs">{label}</span>
    </button>
  );
}

function Panel({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose?: () => void; wide?: boolean }) {
  return (
    <section className={`hud-panel pointer-events-auto absolute left-1/2 top-1/2 max-h-[78vh] w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-5 ${wide ? "max-w-xl" : "max-w-md"}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl text-foreground">{title}</h2>
        {onClose && (
          <button className="hud-close" onClick={onClose} aria-label="Đóng">✕</button>
        )}
      </div>
      {children}
    </section>
  );
}

function TourPanel() {
  return (
    <Panel title="Tham quan chùa" onClose={() => setUI({ panel: null })}>
      <div className="grid grid-cols-2 gap-2">
        {ZONES.map((z) => (
          <button
            key={z.id}
            className="hud-tile"
            onClick={() => {
              teleport(z.x, z.z, z.rot);
              setUI({ panel: null, action: "none", pose: "stand" });
            }}
          >
            {z.name}
          </button>
        ))}
      </div>
    </Panel>
  );
}

const STORIES = [
  { t: "Bát cơm của người mẹ", b: "Một cụ bà mỗi sáng để dành nửa bát cơm cho người hàng xóm neo đơn. Mười năm sau, cả xóm cùng nhau nấu cơm chay mỗi rằm cho người nghèo." },
  { t: "Cây đèn bên đường", b: "Một chú tiểu thắp đèn ở con dốc tối trước chùa. Chẳng ai biết ai thắp, nhưng không còn ai vấp ngã nơi ấy nữa." },
  { t: "Lời xin lỗi", b: "Hai anh em giận nhau ba năm. Sau một buổi nghe pháp về lòng tha thứ, người em gọi điện trước. Cả hai cùng khóc." },
];

function PhapPanel() {
  const [playing, setPlaying] = useState<null | "phap">(null);
  useEffect(() => () => stopSpeak(), []);
  return (
    <Panel title="Phật pháp" onClose={() => setUI({ panel: null })} wide>
      <div className="hud-quote mb-4">
        <div className="mb-1 text-xs uppercase tracking-widest text-primary">Lời Phật dạy hôm nay</div>
        <p className="font-display text-lg italic text-foreground">“{quoteOfDay()}”</p>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-2">
        <button
          className="hud-tile"
          onClick={() => {
            if (playing) {
              stopSpeak();
              setPlaying(null);
              return;
            }
            const z = ZONES.find((x) => x.id === "phap")!;
            teleport(z.x, z.z, z.rot);
            setUI({ pose: "sit", action: "none" });
            setPlaying("phap");
            speak(PHAP_THOAI, () => setPlaying(null));
          }}
        >
          {playing ? "⏹ Dừng thuyết pháp" : "🎙 Nghe thuyết pháp"}
        </button>
        <button className="hud-tile" onClick={() => ringBell(0.6)}>🔔 Thỉnh chuông</button>
        <button className="hud-tile" onClick={() => { setUI({ panel: null }); }}>
          📿 Nghe kinh: dùng nút dưới
        </button>
        <button className="hud-tile" onClick={() => setUI({ panel: "pray" })}>🪷 Gửi lời cầu an</button>
      </div>
      <h3 className="mb-2 font-display text-lg text-foreground">Góc chuyện thiện lành</h3>
      <div className="space-y-2">
        {STORIES.map((s) => (
          <details key={s.t} className="hud-tile text-left">
            <summary className="cursor-pointer font-semibold">{s.t}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{s.b}</p>
          </details>
        ))}
      </div>
    </Panel>
  );
}

const PRAY_KEY = "tam-an-prayers";
function PrayPanel() {
  const [list, setList] = useState<{ text: string; at: number }[]>([]);
  const [text, setText] = useState("");
  useEffect(() => {
    try {
      setList(JSON.parse(localStorage.getItem(PRAY_KEY) || "[]"));
    } catch {
      /* empty */
    }
  }, []);
  const add = () => {
    const t = text.trim();
    if (!t) return;
    const next = [{ text: t.slice(0, 200), at: Date.now() }, ...list].slice(0, 50);
    setList(next);
    localStorage.setItem(PRAY_KEY, JSON.stringify(next));
    setText("");
    ringBell(0.3);
  };
  return (
    <Panel title="Góc cầu nguyện" onClose={() => setUI({ panel: null })}>
      <p className="mb-3 text-sm text-muted-foreground">Gửi lời chúc bình an. Lời nguyện được lưu trên máy của bạn.</p>
      <div className="mb-4 flex gap-2">
        <input className="hud-input flex-1" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Nguyện cho gia đình được an lành…" />
        <button className="hud-primary" onClick={add}>Gửi</button>
      </div>
      <ul className="space-y-2">
        {list.map((p) => (
          <li key={p.at} className="hud-tile text-left text-sm">🪷 {p.text}</li>
        ))}
        {list.length === 0 && <li className="text-sm text-muted-foreground">Chưa có lời nguyện nào.</li>}
      </ul>
    </Panel>
  );
}

const CHAT_KEY = "tam-an-chat";
function ChatPanel({ name }: { name: string }) {
  const [msgs, setMsgs] = useState<{ n: string; t: string; at: number }[]>([]);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      setMsgs(JSON.parse(localStorage.getItem(CHAT_KEY) || "[]"));
    } catch {
      /* empty */
    }
  }, []);
  useEffect(() => end.current?.scrollIntoView(), [msgs]);
  const send = () => {
    const t = text.trim();
    if (!t) return;
    const next = [...msgs, { n: name, t: t.slice(0, 300), at: Date.now() }].slice(-100);
    setMsgs(next);
    localStorage.setItem(CHAT_KEY, JSON.stringify(next));
    setText("");
  };
  return (
    <Panel title="Giao lưu Phật tử" onClose={() => setUI({ panel: null })}>
      <p className="hud-note mb-3">Chưa kết nối máy chủ: tin nhắn hiện chỉ lưu trên máy bạn. Trò chuyện nhiều người sẽ có ở giai đoạn tiếp theo.</p>
      <div className="mb-3 h-56 space-y-1.5 overflow-y-auto rounded-lg bg-muted/50 p-3 text-sm">
        {msgs.length === 0 && <div className="text-muted-foreground">A Di Đà Phật! Hãy gửi lời chào đầu tiên.</div>}
        {msgs.map((m) => (
          <div key={m.at}>
            <b className="text-primary">{m.n}:</b> <span className="text-foreground">{m.t}</span>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="flex gap-2">
        <input className="hud-input flex-1" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Nhập lời chào…" />
        <button className="hud-primary" onClick={send}>Gửi</button>
      </div>
    </Panel>
  );
}

function AvatarPanel({ initial }: { initial: Avatar | null }) {
  const [a, setA] = useState<Avatar>(initial ?? { name: "", outfit: "lam", hair: "ngan", hairColor: HAIR_COLORS[0] });
  const ok = a.name.trim().length >= 2;
  return (
    <Panel title={initial ? "Tùy chỉnh Avatar" : "Tạo Avatar của bạn"} {...(initial ? { onClose: () => setUI({ panel: null }) } : {})}>
      <label className="mb-1 block text-sm font-semibold text-foreground">Tên hiển thị / pháp danh</label>
      <input className="hud-input mb-4 w-full" value={a.name} maxLength={24} onChange={(e) => setA({ ...a, name: e.target.value })} placeholder="Ví dụ: Diệu An" />
      <div className="mb-1 text-sm font-semibold text-foreground">Trang phục</div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(OUTFIT_LABEL) as Outfit[]).map((o) => (
          <button key={o} className="hud-swatch" data-active={a.outfit === o} onClick={() => setA({ ...a, outfit: o, hair: o === "tusi" ? "troc" : a.hair })}>
            <span className="h-4 w-4 rounded-full border border-border" style={{ background: OUTFIT_COLORS[o] }} />
            {OUTFIT_LABEL[o]}
          </button>
        ))}
      </div>
      <div className="mb-1 text-sm font-semibold text-foreground">Kiểu tóc</div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(HAIR_LABEL) as Hair[]).map((h) => (
          <button key={h} className="hud-swatch" data-active={a.hair === h} onClick={() => setA({ ...a, hair: h })}>
            {HAIR_LABEL[h]}
          </button>
        ))}
      </div>
      <div className="mb-1 text-sm font-semibold text-foreground">Màu tóc</div>
      <div className="mb-5 flex gap-2">
        {HAIR_COLORS.map((c) => (
          <button key={c} className="hud-swatch h-8 w-8 justify-center p-0" data-active={a.hairColor === c} onClick={() => setA({ ...a, hairColor: c })} aria-label={c}>
            <span className="h-5 w-5 rounded-full" style={{ background: c }} />
          </button>
        ))}
      </div>
      <button
        className="hud-primary w-full"
        disabled={!ok}
        onClick={() => {
          saveAvatar({ ...a, name: a.name.trim() });
          setUI({ panel: null });
          ringBell(0.4);
        }}
      >
        {initial ? "Lưu thay đổi" : "Bước vào chùa 🙏"}
      </button>
    </Panel>
  );
}

function MeditationOverlay() {
  const [mins, setMins] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (mins === null) return;
    setLeft(mins * 60);
    const id = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          window.clearInterval(id);
          ringBell(0.6);
          setTimeout(() => setUI({ action: "none", pose: "stand" }), 1500);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [mins]);
  return (
    <div className="pointer-events-auto absolute left-1/2 top-24 -translate-x-1/2 text-center">
      <div className="hud-glass px-6 py-4">
        {mins === null ? (
          <>
            <div className="mb-2 font-display text-lg text-foreground">Chọn thời gian thiền</div>
            <div className="flex gap-2">
              {[1, 5, 10, 20].map((m) => (
                <button key={m} className="hud-swatch" onClick={() => setMins(m)}>{m} phút</button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-5">
            <div className="breath-orb" />
            <div className="text-left">
              <div className="font-display text-3xl tabular-nums text-foreground">
                {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
              </div>
              <div className="text-xs text-muted-foreground">Thở vào – tâm tĩnh lặng · Thở ra – mỉm cười</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SutraOverlay() {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-24 w-[92vw] max-w-lg -translate-x-1/2">
      <div className="hud-glass px-5 py-4">
        <div className="mb-1 text-xs uppercase tracking-widest text-primary">Bát Nhã Tâm Kinh</div>
        <p className="font-display text-sm italic leading-relaxed text-foreground">{TAM_KINH}</p>
        <button className="hud-swatch mt-3" onClick={() => { stopSpeak(); setUI({ action: "none", pose: "stand" }); }}>⏹ Dừng</button>
      </div>
    </div>
  );
}

function Joystick() {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const base = useRef<HTMLDivElement>(null);
  const move = (cx: number, cy: number) => {
    const r = base.current!.getBoundingClientRect();
    let dx = cx - (r.left + r.width / 2);
    let dy = cy - (r.top + r.height / 2);
    const max = r.width / 2;
    const l = Math.hypot(dx, dy);
    if (l > max) {
      dx = (dx / l) * max;
      dy = (dy / l) * max;
    }
    setKnob({ x: dx, y: dy });
    input.joyR = dx / max;
    input.joyF = -dy / max;
  };
  const end = () => {
    setKnob({ x: 0, y: 0 });
    input.joyR = 0;
    input.joyF = 0;
  };
  return (
    <div
      ref={base}
      className="joystick pointer-events-auto absolute bottom-28 left-5 md:hidden"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        move(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => e.buttons && move(e.clientX, e.clientY)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
