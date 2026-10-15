# hive-map proof

- feature: `hive-map` / `map-select-hive`
- entry: root URL → click marker `Colmeia 1, Estável`
- commands: `control-app launch` → `doctor` → `browser goto` → `click` hive 1 → `wait` details region → `snapshot` / `screenshot`
- observables: ARIA shows `region "Detalhes da colmeia 1"` and marker `Colmeia 1, Estável` pressed; screenshots show farm chrome + details
- artifacts: `selected.png`, `selected-full.png`, `selected.aria.txt`, `headed-selected.png`, `drive.mp4`
- cleanup: ran `control-app cleanup`; these files remained under this directory
