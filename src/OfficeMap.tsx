import { useId } from "react";
import type { Agent, Task } from "./types";

const point = (x: number, y: number, z = 0) => [
  500 + (x - y) * 0.75,
  72 + (x + y) * 0.38 - z,
];
const pts = (v: number[][]) => v.map((p) => p.join(",")).join(" ");
function Tile({
  x,
  y,
  w,
  d,
  fill,
  stroke,
}: {
  x: number;
  y: number;
  w: number;
  d: number;
  fill: string;
  stroke?: string;
}) {
  return (
    <polygon
      points={pts([
        point(x, y),
        point(x + w, y),
        point(x + w, y + d),
        point(x, y + d),
      ])}
      fill={fill}
      stroke={stroke}
    />
  );
}
function Box({
  x,
  y,
  w,
  d,
  h,
  top,
  side = "#d0c8b5",
  front = "#b9b09c",
}: {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  top: string;
  side?: string;
  front?: string;
}) {
  return (
    <g>
      <polygon
        points={pts([
          point(x, y + d),
          point(x + w, y + d),
          point(x + w, y + d, h),
          point(x, y + d, h),
        ])}
        fill={front}
      />
      <polygon
        points={pts([
          point(x + w, y),
          point(x + w, y + d),
          point(x + w, y + d, h),
          point(x + w, y, h),
        ])}
        fill={side}
      />
      <polygon
        points={pts([
          point(x, y, h),
          point(x + w, y, h),
          point(x + w, y + d, h),
          point(x, y + d, h),
        ])}
        fill={top}
      />
    </g>
  );
}
function Plant({
  x,
  y,
  small = false,
}: {
  x: number;
  y: number;
  small?: boolean;
}) {
  const [a, b] = point(x, y);
  return (
    <g transform={`translate(${a} ${b}) scale(${small ? 0.65 : 1})`}>
      <ellipse cy="1" rx="18" ry="8" fill="#514d3c" opacity=".09" />
      <path d="M-10-16H10L7 2Q0 8-7 2Z" fill="#cfbea2" />
      <ellipse cy="-16" rx="10" ry="4" fill="#dfceb3" />
      <path
        d="M0-17V-50M0-29L-11-39M0-33L10-47"
        stroke="#486549"
        strokeWidth="2.5"
      />
      <ellipse
        cx="-9"
        cy="-45"
        rx="7"
        ry="15"
        transform="rotate(-35 -9 -45)"
        fill="#6f8b58"
      />
      <ellipse
        cx="9"
        cy="-48"
        rx="7"
        ry="16"
        transform="rotate(30 9 -48)"
        fill="#88a270"
      />
      <ellipse cy="-59" rx="8" ry="15" fill="#587449" />
      <ellipse
        cx="-11"
        cy="-28"
        rx="7"
        ry="12"
        transform="rotate(-55 -11 -28)"
        fill="#87a66c"
      />
      <ellipse
        cx="12"
        cy="-32"
        rx="7"
        ry="13"
        transform="rotate(50 12 -32)"
        fill="#6a8858"
      />
    </g>
  );
}
function Desk({
  x,
  y,
  color = "#ded5c2",
  flipped = false,
}: {
  x: number;
  y: number;
  color?: string;
  flipped?: boolean;
}) {
  const [a, b] = point(x + 52, y + 20, 41);
  return (
    <g>
      <Box x={x + 10} y={y + 7} w={8} d={8} h={36} top="#b6a98a" />
      <Box x={x + 90} y={y + 37} w={8} d={8} h={36} top="#b6a98a" />
      <Box
        x={x}
        y={y}
        w={114}
        d={60}
        h={39}
        top={color}
        side="#b7a98d"
        front="#cabb9f"
      />
      <g transform={`translate(${a} ${b})`}>
        <path d="M-24-25 7-40 7-9-24 6Z" fill="#3d4944" />
        <path
          d="M-20-24 3-35 3-11-20 1Z"
          fill={flipped ? "#d5e5e9" : "#b9d39e"}
        />
        <path d="M-16-21-1-28M-16-15-5-21" stroke="#6c947a" strokeWidth="2" />
        <path
          d="M-7 2V11L-17 16 0 7"
          fill="none"
          stroke="#646a60"
          strokeWidth="3"
        />
      </g>
      <Tile x={x + 27} y={y + 38} w={32} d={12} fill="#f7f3e8" />
      <path
        d={`M${point(x + 85, y + 42, 41).join(",")}l7 3`}
        stroke="#d6ebe0"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </g>
  );
}
function Character({
  x,
  y,
  color,
  hair,
}: {
  x: number;
  y: number;
  color: string;
  hair: string;
}) {
  const [a, b] = point(x, y);
  return (
    <g transform={`translate(${a} ${b})`}>
      <ellipse cy="1" rx="22" ry="9" fill="#434535" opacity=".13" />
      <path
        d="M-11-15-13 2-4 6 0-12M4-13 5 5 14 1 12-18"
        stroke={hair}
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path d="M-14-43Q0-52 14-43L13-17Q0-10-13-17Z" fill={color} />
      <path
        d="M-14-41-20-25M14-41 21-29"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cy="-57" r="14" fill="#c99a7e" />
      <path
        d="M-14-57Q-18-78 3-75Q18-75 14-53L8-61Q-3-57-8-63L-11-53Z"
        fill={hair}
      />
      <path
        d="M-3-58H-2M6-58H7"
        stroke="#564c40"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M0-50Q3-47 6-51"
        fill="none"
        stroke="#996d57"
        strokeWidth="1.5"
      />
    </g>
  );
}

export default function OfficeMap({
  agents,
  tasks,
  selected,
  onSelect,
  zoom,
}: {
  agents: Agent[];
  tasks: Task[];
  selected?: string;
  onSelect: (agent: Agent) => void;
  zoom: number;
}) {
  const id = useId().replace(/:/g, "");
  const positions: Record<string, [number, number]> = {
    dot: [125, 125],
    atlas: [370, 115],
    vera: [575, 180],
    tempo: [155, 345],
    nia: [425, 340],
  };
  return (
    <div className="office-canvas">
      <svg
        viewBox="70 -50 1010 620"
        role="group"
        aria-label="Oficina virtual de JAC Music. Selecciona un agente para asignarle una tarea."
      >
        <defs>
          <filter
            id={`shadow-${id}`}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="12" />
          </filter>
          <pattern
            id={`grid-${id}`}
            width="34"
            height="18"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 9L17 0 34 9 17 18Z"
              fill="none"
              stroke="#b8bca7"
              strokeWidth=".4"
            />
          </pattern>
        </defs>
        <g transform={`translate(490 240) scale(${zoom}) translate(-490 -240)`}>
          <ellipse
            cx="508"
            cy="412"
            rx="310"
            ry="52"
            fill="#596c47"
            opacity=".10"
            filter={`url(#shadow-${id})`}
          />
          <Box
            x={0}
            y={0}
            w={680}
            d={485}
            h={-10}
            top="#e6e8d9"
            side="#c6c8b7"
            front="#d5d7c6"
          />
          <Tile x={0} y={0} w={680} d={485} fill={`url(#grid-${id})`} />
          <Tile x={18} y={15} w={232} d={192} fill="#dce4cb" />
          <Tile x={277} y={15} w={240} d={192} fill="#d6e0df" />
          <Tile x={542} y={15} w={120} d={270} fill="#e7ddcb" />
          <Tile x={18} y={240} w={235} d={222} fill="#ded7e2" />
          <Tile x={280} y={247} w={245} d={215} fill="#e5e0c9" />
          <Box
            x={0}
            y={0}
            w={680}
            d={8}
            h={83}
            top="#f6f4e9"
            side="#d5d9c9"
            front="#e2e5d7"
          />
          <Box
            x={0}
            y={0}
            w={8}
            d={485}
            h={83}
            top="#f6f4e9"
            side="#d3d8c6"
            front="#cbd3bc"
          />
          <g transform={`translate(${point(40, 3, 61).join(" ")})`}>
            <path d="M0 0 56 28V58L0 30Z" fill="#52644b" />
            <path
              d="M10 15V31M19 16V40M28 26V40M37 26V49M46 37V48"
              stroke="#d9eeb8"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g transform={`translate(${point(370, 5, 52).join(" ")})`}>
            <path d="M0 0 94 47V87L0 40Z" fill="#c0ccbc" />
            <path d="M8 8 86 47V76L8 37Z" fill="#f7f4e8" />
            <path
              d="M20 24 66 48M20 32 49 46"
              stroke="#b4c1a4"
              strokeWidth="4"
            />
          </g>
          <Box
            x={250}
            y={10}
            w={6}
            d={150}
            h={29}
            top="#f1f0e5"
            side="#c5ccb7"
          />
          <Box
            x={530}
            y={10}
            w={6}
            d={164}
            h={29}
            top="#f1f0e5"
            side="#c5ccb7"
          />
          <Box
            x={18}
            y={222}
            w={180}
            d={5}
            h={27}
            top="#f1f0e5"
            front="#cbcfc1"
          />
          <Box
            x={278}
            y={222}
            w={190}
            d={5}
            h={27}
            top="#f1f0e5"
            front="#cbcfc1"
          />
          <Desk x={62} y={52} color="#d2c5a4" />
          <Plant x={221} y={44} />
          <Desk x={308} y={43} color="#d5d5c4" flipped />
          <Plant x={493} y={43} />
          <Box
            x={560}
            y={27}
            w={80}
            d={30}
            h={40}
            top="#d1bda4"
            side="#b6a085"
            front="#bfa98e"
          />
          <Box
            x={567}
            y={32}
            w={12}
            d={17}
            h={66}
            top="#5d695c"
            side="#39463a"
            front="#4b574a"
          />
          <Plant x={633} y={118} small />
          <Desk x={550} y={211} color="#dbcbb6" flipped />
          <Desk x={81} y={262} color="#d2c8d0" />
          <Plant x={44} y={428} />
          <Box
            x={293}
            y={272}
            w={178}
            d={99}
            h={33}
            top="#c8b886"
            side="#a49366"
            front="#baaa78"
          />
          <Tile x={320} y={302} w={54} d={28} fill="#ede9d9" />
          <Box
            x={405}
            y={300}
            w={32}
            d={24}
            h={38}
            top="#5a665b"
            side="#414b42"
            front="#485249"
          />
          <Plant x={500} y={419} />
          <Box
            x={555}
            y={326}
            w={94}
            d={45}
            h={22}
            top="#a7b793"
            side="#8c9c78"
            front="#97a883"
          />
          <Box
            x={555}
            y={321}
            w={94}
            d={9}
            h={41}
            top="#afbd9b"
            side="#869871"
            front="#98aa84"
          />
          <Box
            x={569}
            y={392}
            w={63}
            d={40}
            h={18}
            top="#e0d6be"
            side="#b5a98d"
            front="#cbbda1"
          />
          <Plant x={653} y={442} />
          <g
            opacity=".72"
            fill="#65705d"
            fontSize="9"
            fontFamily="DM Sans, sans-serif"
            fontWeight="700"
            letterSpacing="2"
          >
            <text
              transform={`translate(${point(40, 188).join(" ")}) rotate(27)`}
            >
              DIRECCIÓN
            </text>
            <text
              transform={`translate(${point(301, 188).join(" ")}) rotate(27)`}
            >
              ITINERARIOS
            </text>
            <text
              transform={`translate(${point(56, 443).join(" ")}) rotate(27)`}
            >
              AGENDA
            </text>
            <text
              transform={`translate(${point(311, 443).join(" ")}) rotate(27)`}
            >
              EL PUNTO DE ENCUENTRO
            </text>
          </g>
          {agents.map((agent) => {
            const [x, y] = positions[agent.id];
            const [a, b] = point(x, y);
            const busy = tasks.some(
              (t) => t.agentId === agent.id && t.status === "running",
            );
            const active = selected === agent.id;
            return (
              <g
                key={agent.id}
                className={`office-agent ${active ? "selected" : ""}`}
                onClick={() => onSelect(agent)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(agent);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Asignar una tarea a ${agent.name}`}
              >
                <ellipse
                  cx={a}
                  cy={b + 1}
                  rx="29"
                  ry="14"
                  fill={active ? "#b9d792" : "#f9f8ed"}
                  stroke={active ? "#6c874e" : "#bcc7ae"}
                  strokeWidth={active ? 2 : 1}
                />
                <Character x={x} y={y} color={agent.color} hair={agent.hair} />
                <g
                  transform={`translate(${a - 41} ${b - 113})`}
                  className="agent-map-label"
                >
                  <rect
                    width="82"
                    height="28"
                    rx="9"
                    fill={active ? "#29392a" : "#fefef8"}
                    stroke={active ? "#29392a" : "#d7dacd"}
                  />
                  <circle
                    cx="14"
                    cy="14"
                    r="3"
                    fill={busy ? "#c7995e" : "#7c9a62"}
                    className={busy ? "pulse" : ""}
                  />
                  <text
                    x="26"
                    y="18"
                    fill={active ? "#e9f6da" : "#3d483a"}
                    fontSize="11"
                    fontFamily="DM Sans, sans-serif"
                    fontWeight="700"
                  >
                    {agent.name}
                  </text>
                  <path
                    d="M36 28 41 34 46 28"
                    fill={active ? "#29392a" : "#fefef8"}
                  />
                </g>
              </g>
            );
          })}
          <Plant x={21} y={207} small />
          <g transform={`translate(${point(618, 70, 77).join(" ")})`}>
            <path d="M-6-8 13 2 13 28-6 18Z" fill="#8f9b7b" />
            <path d="M0 0 7 4V19L0 15Z" fill="#d6e2bf" />
          </g>
        </g>
      </svg>
    </div>
  );
}
