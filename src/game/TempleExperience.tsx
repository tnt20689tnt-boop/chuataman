import { lazy, Suspense } from "react";
import { Hud } from "./Hud";

const World = lazy(() => import("./World"));

export default function TempleExperience() {
  return (
    <>
      <Suspense fallback={<div className="loading-screen">Đang mở cổng chùa…</div>}>
        <World />
      </Suspense>
      <Hud />
    </>
  );
}