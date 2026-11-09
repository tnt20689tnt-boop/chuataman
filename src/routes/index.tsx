import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const TempleExperience = lazy(() => import("@/game/TempleExperience"));
const title = "Chùa Tâm An – Không gian Phật giáo 3D";
const description = "Chùa Tâm An là không gian chùa ảo 3D để tham quan chính điện, hồ sen, vườn thiền, lễ Phật, ngồi thiền và nghe kinh trực tuyến.";
const url = "https://chuataman.lovable.app/";

export const Route = createFileRoute("/")({
  ssr: true,
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:locale", content: "vi_VN" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [
      { rel: "canonical", href: url },
    ],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebSite", "@id": `${url}#website`, url, name: "Chùa Tâm An", description, inLanguage: "vi" },
          { "@type": "WebPage", "@id": `${url}#webpage`, url, name: title, description, inLanguage: "vi", isPartOf: { "@id": `${url}#website` } },
        ],
      }),
    }],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-background">
      <section className="sr-only" aria-label="Chùa Tâm An">
        <h1>{title}</h1>
        <p>{description}</p>
        <p>Không gian tham quan gồm chính điện, nhà thờ tổ, thiền đường, nhà giảng pháp, thư viện Phật giáo, vườn thiền và hồ sen.</p>
      </section>
      <ClientOnly
        fallback={
          <div className="loading-screen">
            <div className="max-w-2xl px-6 text-center">
              <h1 className="mb-4 text-3xl font-bold">Chùa Tâm An – Không gian Phật giáo 3D</h1>
              <p className="mb-3 text-base leading-relaxed">{description}</p>
              <p className="text-sm leading-relaxed">
                Khám phá chính điện, nhà thờ tổ, thiền đường, nhà giảng pháp,
                thư viện Phật giáo, vườn thiền và hồ sen trong không gian thanh tịnh.
              </p>
              <p className="mt-5 text-sm">Đang mở không gian tham quan 3D…</p>
            </div>
          </div>
        }
      >
        <Suspense
          fallback={
            <div className="loading-screen">
              <div className="max-w-2xl px-6 text-center">
                <h1 className="mb-4 text-3xl font-bold">Chùa Tâm An</h1>
                <p className="text-base leading-relaxed">{description}</p>
                <p className="mt-5 text-sm">Đang mở không gian tham quan 3D…</p>
              </div>
            </div>
          }
        >
          <TempleExperience />
        </Suspense>
      </ClientOnly>
    </main>
  );
}
