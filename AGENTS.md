<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Chùa Tâm An 3D
- 3D world lives in `src/game/`: rules/data in plain TS (`sim.ts`), per-frame state in mutable objects (`store.ts`), React UI state via a tiny `useUI` store — keeps 60fps without React re-renders.
- The 1,000 demo NPCs are drawn with three InstancedMeshes and only the nearest ~14 get name tags; never render NPCs as individual meshes.
- Demo NPCs are never counted as online users; the online count must come only from real sessions.
- `/` route is `ssr: false` and lazy-loads the Canvas.
