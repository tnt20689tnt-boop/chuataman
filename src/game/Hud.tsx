import { useEffect, useRef, useState } from "react";
import { HAIR_COLORS, HAIR_LABEL, OUTFIT_COLORS, OUTFIT_LABEL, PHAP_THOAI, TAM_KINH, ZONES, quoteOfDay, type Hair, type Outfit } from "./sim";
import { input, loadAvatar, saveAvatar, setUI, teleport, useUI, type Avatar } from "./store";
import { ringBell, speak, stopSpeak } from "./audio";
import { connectMultiplayer, disconnectMultiplayer, sendTempleChat, sendTemplePrayer, useMultiplayer, useTempleChat, useTemplePrayers } from "./multiplayer";
import { getAuthClient, type User } from "./auth";

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
    connectMultiplayer();
    const auth = getAuthClient();
    const authListener = auth?.auth.onAuthStateChange(() => {
      disconnectMultiplayer();
      connectMultiplayer();
    });
    return () => {
      authListener?.data.subscription.unsubscribe();
      disconnectMultiplayer();
    };
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
          <button className="hud-swatch mt-2" onClick={() => setUI({ panel: "auth" })}>👤 Đăng nhập / Tài khoản</button>
        </div>
      </header>

      <div className="absolute right-3 top-3 flex flex-col items-end gap-2 sm:right-5 sm:top-5">
        <div className="hud-glass pointer-events-auto flex items-center gap-2 px-3 py-1.5 text-xs text-foreground">
          <span className={`h-2 w-2 rounded-full ${multiplayer.connected ? "bg-success" : "bg-muted-foreground"}`} />
          <span>Phật tử đang hiện diện: <b>{multiplayer.connected ? multiplayer.players.length + 1 : 0}</b>{multiplayer.connected ? " người" : " · đăng nhập để hiện diện"}</span>
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
      {panel === "auth" && <AuthPanel />}
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

const ZONE_GUIDES: Record<string, string> = {
  cong: "Bắt đầu hành trình từ cổng tam quan. Dừng lại một chút, gác lại những vội vàng bên ngoài và bước vào chùa với tâm an lành.",
  san: "Khoảng sân rộng là nơi Phật tử gặp gỡ, đi dạo và hướng lòng về điều thiện. Bạn có thể đi bộ quanh sân và ngắm toàn cảnh ngôi chùa.",
  dien: "Đại điện là nơi trang nghiêm để lễ Phật, chắp tay và lắng lòng. Hãy giữ bước chân nhẹ nhàng và dành một phút tĩnh tâm.",
  thien: "Khu thiền định yên tĩnh bên tượng Phật. Chọn nút Ngồi thiền phía dưới để thực tập hơi thở trong 1, 5, 10 hoặc 20 phút.",
  phap: "Giảng đường là nơi lắng nghe lời Phật dạy và những câu chuyện thiện lành. Mở mục Phật pháp để nghe bài thuyết pháp.",
  ho: "Hồ sen và vườn hoa là góc thư thái, nơi bạn có thể ngắm cảnh và nghỉ chân giữa hành trình.",
  chuong: "Tháp chuông nhắc ta quay về với hiện tại. Bạn có thể thỉnh chuông bằng nút Chuông ở cạnh phải màn hình.",
  kinh: "Tháp kinh tượng trưng cho kho tàng lời Phật dạy. Tại đây, bạn có thể đọc và nghe Bát Nhã Tâm Kinh.",
  giaoluu: "Khu giao lưu dành cho các Phật tử gặp gỡ. Mở mục Giao lưu để gửi lời chào tới những người đang cùng online.",
  phongsinh: "Khu phóng sinh mang ý nghĩa nuôi dưỡng lòng từ bi và trân trọng sự sống. Đây là điểm dừng để quán niệm về tình thương.",
};

function TourPanel() {
  const [selected, setSelected] = useState(0);
  const zone = ZONES[selected];
  const visit = () => {
    teleport(zone.x, zone.z, zone.rot);
    setUI({ panel: null, action: "none", pose: "stand" });
  };
  return (
    <Panel title="Hành trình tham quan" onClose={() => setUI({ panel: null })} wide>
      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
          Điểm {selected + 1} / {ZONES.length}
        </div>
        <h3 className="mb-2 font-display text-xl text-foreground">{zone.name}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{ZONE_GUIDES[zone.id]}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="hud-primary" onClick={visit}>📍 Đến địa điểm này</button>
          <button className="hud-swatch" onClick={() => setSelected((i) => (i + ZONES.length - 1) % ZONES.length)}>← Trước</button>
          <button className="hud-swatch" onClick={() => setSelected((i) => (i + 1) % ZONES.length)}>Tiếp theo →</button>
        </div>
      </div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chọn nhanh địa điểm</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ZONES.map((z, i) => (
          <button key={z.id} className="hud-tile" data-active={selected === i} onClick={() => setSelected(i)}>
            <span className="mr-1 text-primary">{String(i + 1).padStart(2, "0")}.</span>{z.name}
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

function PrayPanel() {
  const [text, setText] = useState("");
  const prayers = useTemplePrayers();
  const multiplayer = useMultiplayer();
  const avatar = useUI((s) => s.avatar);
  const add = () => {
    const t = text.trim();
    if (!t || !multiplayer.connected) return;
    if (sendTemplePrayer(avatar?.name || "Phật tử", t)) {
      setText("");
      ringBell(0.3);
    }
  };
  return (
    <Panel title="Góc cầu nguyện chung" onClose={() => setUI({ panel: null })}>
      <p className="mb-3 text-sm text-muted-foreground">
        {multiplayer.connected
          ? "Gửi lời cầu an để mọi Phật tử đang online cùng đọc và hồi hướng điều lành."
          : "Chùa đang kết nối máy chủ. Khi online, bạn có thể gửi lời nguyện để mọi người cùng đọc."}
      </p>
      <div className="mb-4 flex gap-2">
        <input className="hud-input min-w-0 flex-1" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Nguyện cho gia đình được an lành…" disabled={!multiplayer.connected} />
        <button className="hud-primary" onClick={add} disabled={!multiplayer.connected || !text.trim()}>Gửi lời nguyện</button>
      </div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>🪷 Lời nguyện từ Phật tử đang hiện diện</span>
        <span>{prayers.length} lời</span>
      </div>
      <ul className="space-y-2">
        {prayers.map((p) => (
          <li key={p.id} className="hud-tile text-left text-sm">
            <div>🪷 {p.text}</div>
            <div className="mt-1 text-xs text-muted-foreground">— {p.name}</div>
          </li>
        ))}
        {prayers.length === 0 && <li className="hud-tile text-sm text-muted-foreground">Chưa có lời nguyện nào. Hãy là người gửi lời cầu an đầu tiên.</li>}
      </ul>
    </Panel>
  );
}
function ChatPanel({ name }: { name: string }) {
  const msgs = useTempleChat();
  const [text, setText] = useState("");
  const multiplayer = useMultiplayer();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView(), [msgs]);
  const send = () => {
    const t = text.trim();
    if (!t) return;
    if (sendTempleChat(name, t)) setText("");
  };
  return (
    <Panel title="Giao lưu Phật tử" onClose={() => setUI({ panel: null })}>
      <p className="hud-note mb-3">
        {multiplayer.connected
          ? "Tin nhắn đang được gửi trực tiếp tới những Phật tử cùng online. Nội dung không lưu sau khi rời phiên."
          : "Chưa kết nối máy chủ. Khi kết nối online hoạt động, bạn có thể trò chuyện với mọi người trong chùa."}
      </p>
      <div className="mb-3 h-56 space-y-1.5 overflow-y-auto rounded-lg bg-muted/50 p-3 text-sm">
        {msgs.length === 0 && <div className="text-muted-foreground">A Di Đà Phật! Hãy gửi lời chào đầu tiên.</div>}
        {msgs.map((m) => (
          <div key={m.id}>
            <b className="text-primary">{m.name}:</b> <span className="text-foreground">{m.text}</span>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="flex gap-2">
        <input className="hud-input flex-1" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Nhập lời chào…" disabled={!multiplayer.connected} />
        <button className="hud-primary" onClick={send} disabled={!multiplayer.connected || !text.trim()}>Gửi</button>
      </div>
    </Panel>
  );
}

function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const client = getAuthClient();

  useEffect(() => {
    if (!client) return;
    void client.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = client.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    if (!client) return setMessage("Chưa cấu hình máy chủ đăng nhập. Vui lòng thử lại sau.");
    if (!email.trim() || !password) return setMessage("Vui lòng nhập email và mật khẩu.");
    setBusy(true); setMessage("");
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    setMessage(error ? "Đăng nhập chưa thành công: " + error.message : "Đăng nhập thành công. A Di Đà Phật!");
  };

  const signUp = async () => {
    if (!client) return setMessage("Chưa cấu hình máy chủ đăng nhập. Vui lòng thử lại sau.");
    if (!displayName.trim() || !email.trim() || password.length < 6) return setMessage("Nhập tên, email và mật khẩu ít nhất 6 ký tự.");
    setBusy(true); setMessage("");
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: displayName.trim().slice(0, 24) } },
    });
    setBusy(false);
    if (error) setMessage("Chưa đăng ký được: " + error.message);
    else if (!data.session) setMessage("Đã tạo tài khoản. Hãy mở email để xác nhận, sau đó đăng nhập.");
    else setMessage("Đăng ký thành công. Chào mừng bạn đến Chùa Tâm An!");
  };

  const signOut = async () => {
    if (!client) return;
    setBusy(true);
    const { error } = await client.auth.signOut();
    setBusy(false);
    setMessage(error ? "Chưa đăng xuất được: " + error.message : "Bạn đã đăng xuất.");
  };

  return (
    <Panel title="Tài khoản Phật tử" onClose={() => setUI({ panel: null })}>
      {!client && <p className="hud-note mb-3">Máy chủ đăng nhập chưa được cấu hình. Chức năng tham quan chùa vẫn dùng bình thường.</p>}
      {user ? (
        <>
          <div className="hud-tile mb-3">
            <div className="text-xs text-muted-foreground">Đang đăng nhập</div>
            <div className="mt-1 font-semibold text-foreground">{String(user.user_metadata?.display_name || "Phật tử")}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
          <button className="hud-primary w-full" disabled={busy} onClick={() => void signOut()}>{busy ? "Đang xử lý…" : "Đăng xuất"}</button>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">Tạo tài khoản miễn phí để lưu danh tính Phật tử và sử dụng các tiện ích cá nhân.</p>
          <label className="mb-1 block text-sm font-semibold">Tên hiển thị / pháp danh</label>
          <input className="hud-input mb-3 w-full" value={displayName} maxLength={24} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ví dụ: Diệu An" autoComplete="nickname" />
          <label className="mb-1 block text-sm font-semibold">Email</label>
          <input className="hud-input mb-3 w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@email.com" autoComplete="email" />
          <label className="mb-1 block text-sm font-semibold">Mật khẩu</label>
          <input className="hud-input mb-3 w-full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ít nhất 6 ký tự" autoComplete="current-password" />
          <div className="grid grid-cols-2 gap-2">
            <button className="hud-primary" disabled={busy || !client} onClick={() => void signIn()}>{busy ? "Đang xử lý…" : "Đăng nhập"}</button>
            <button className="hud-swatch justify-center" disabled={busy || !client} onClick={() => void signUp()}>Đăng ký miễn phí</button>
          </div>
        </>
      )}
      {message && <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p>}
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Không thu phí. Chùa không yêu cầu thông tin thanh toán. Hãy giữ mật khẩu riêng tư và không chia sẻ cho người khác.</p>
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
