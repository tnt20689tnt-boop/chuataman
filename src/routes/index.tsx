import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Hud } from "@/game/Hud";

const World = lazy(() => import("@/game/World"));

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Chùa Tâm An – Thế giới tâm linh 3D" },
      { name: "description", content: "Bước vào ngôi chùa ảo 3D: lễ Phật, ngồi thiền, nghe kinh cùng hàng ngàn Phật tử. An yên trong tâm – Hạnh phúc trong đời." },
      { property: "og:title", content: "Chùa Tâm An – Thế giới tâm linh 3D" },
      { property: "og:description", content: "Ngôi chùa ảo 3D để lễ Phật, thiền định và nghe pháp trực tuyến." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-background">
      <h1 className="sr-only">Chùa Tâm An – Thế giới tâm linh 3D</h1>
      <Suspense fallback={<div className="loading-screen">Đang mở cổng chùa…</div>}>
        <World />
      </Suspense>
      <Hud />
    </main>
  );
}
