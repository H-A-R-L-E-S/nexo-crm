"use client";

import { useId } from "react";

export function LoginLamp() {
  const id = useId().replaceAll(":", "");
  const paint = (name: string) => `url(#${id}-${name})`;

  return (
    <svg viewBox="0 0 640 500" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-cable`} x1="314" y1="0" x2="327" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#08090b" /><stop offset=".35" stopColor="#646368" /><stop offset=".55" stopColor="#242529" /><stop offset="1" stopColor="#08090b" />
        </linearGradient>
        <linearGradient id={`${id}-socket`} x1="281" y1="0" x2="359" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#090a0c" /><stop offset=".18" stopColor="#414143" /><stop offset=".36" stopColor="#1a1b1e" /><stop offset=".78" stopColor="#08090b" /><stop offset="1" stopColor="#454548" />
        </linearGradient>
        <linearGradient id={`${id}-brass`} x1="268" y1="0" x2="372" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#37271a" /><stop offset=".12" stopColor="#bd8c52" /><stop offset=".23" stopColor="#e7c18a" /><stop offset=".4" stopColor="#6c4c2c" /><stop offset=".7" stopColor="#38281d" /><stop offset=".93" stopColor="#c5a06c" /><stop offset="1" stopColor="#70502f" />
        </linearGradient>
        <linearGradient id={`${id}-shell`} x1="100" y1="275" x2="530" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#16171a" /><stop offset=".08" stopColor="#3c3835" /><stop offset=".19" stopColor="#4b4846" /><stop offset=".35" stopColor="#262629" /><stop offset=".55" stopColor="#17191c" /><stop offset=".8" stopColor="#36383d" /><stop offset=".93" stopColor="#24262b" /><stop offset="1" stopColor="#111215" />
        </linearGradient>
        <radialGradient id={`${id}-reflection`} cx="0" cy="0" r="1" gradientTransform="translate(210 266) rotate(35) scale(100 146)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d3c5b4" stopOpacity=".24" /><stop offset="1" stopColor="#c6bbaf" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-edge`} x1="103" y1="376" x2="537" y2="376" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4b3c2d" /><stop offset=".16" stopColor="#b49a77" /><stop offset=".5" stopColor="#40362c" /><stop offset=".82" stopColor="#b69a72" /><stop offset="1" stopColor="#3d3228" />
        </linearGradient>
        <radialGradient id={`${id}-inside`} cx="0" cy="0" r="1" gradientTransform="translate(320 383) scale(224 78)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#61503b" /><stop offset=".4" stopColor="#66523b" /><stop offset=".8" stopColor="#8c704d" /><stop offset="1" stopColor="#33291f" />
        </radialGradient>
        <radialGradient id={`${id}-inside-lit`} cx="0" cy="0" r="1" gradientTransform="translate(320 394) scale(227 85)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff0c1" /><stop offset=".25" stopColor="#eeb96d" /><stop offset=".7" stopColor="#a77535" /><stop offset=".91" stopColor="#d8ab69" /><stop offset="1" stopColor="#63441e" />
        </radialGradient>
        <linearGradient id={`${id}-glass`} x1="290" y1="382" x2="349" y2="394" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d8d4c9" stopOpacity=".3" /><stop offset=".18" stopColor="#b6b9b9" stopOpacity=".04" /><stop offset=".55" stopColor="#e3dacc" stopOpacity=".12" /><stop offset="1" stopColor="#f6e8d0" stopOpacity=".3" />
        </linearGradient>
        <radialGradient id={`${id}-warm-glass`} cx="0" cy="0" r="1" gradientTransform="translate(320 396) scale(42 66)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffd68c" stopOpacity=".52" /><stop offset="1" stopColor="#ffd68c" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-halo`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="25" /></filter>
        <filter id={`${id}-filament`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" /></filter>
        <clipPath id={`${id}-dome`}><path d="M101 367C128 265 214 193 304 180H336C426 193 513 265 539 367C539 402 441 433 320 433S101 402 101 367Z" /></clipPath>
      </defs>

      <path d="M314 0H326V94H314Z" fill={paint("cable")} />
      <path d="M302 96C302 85 338 85 338 96V126H302Z" fill={paint("socket")} stroke="#555052" strokeOpacity=".4" />
      <ellipse cx="320" cy="125" rx="51" ry="12" fill={paint("brass")} />
      <path d="M269 125V150C269 165 371 165 371 150V125C355 139 285 139 269 125Z" fill={paint("brass")} />
      <path d="M281 151C281 136 359 136 359 151V181H281Z" fill={paint("socket")} />
      <ellipse cx="320" cy="181" rx="66" ry="13" fill={paint("socket")} stroke="#4c4944" strokeOpacity=".55" />

      <path d="M101 367C128 265 214 193 304 180H336C426 193 513 265 539 367C539 402 441 433 320 433S101 402 101 367Z" fill={paint("shell")} stroke="#4d4945" strokeWidth="1.2" />
      <g clipPath={paint("dome")}>
        <ellipse cx="210" cy="274" rx="137" ry="160" fill={paint("reflection")} />
        {Array.from({ length: 30 }, (_, index) => <path key={index} d={`M96 ${209 + index * 6}Q320 ${145 + index * 6} 544 ${209 + index * 6}`} stroke="#e0d9d1" strokeOpacity=".035" strokeWidth=".7" />)}
        <path d="M133 333C160 253 228 204 289 192" stroke="#d1b78c" strokeOpacity=".18" strokeWidth="2" />
        <path d="M496 302C473 245 428 211 371 194" stroke="#aab0bb" strokeOpacity=".13" strokeWidth="1.4" />
      </g>
      <ellipse cx="320" cy="376" rx="218" ry="57" fill={paint("inside")} stroke={paint("edge")} strokeWidth="3" />
      <ellipse data-lamp-part="reflector" cx="320" cy="376" rx="216" ry="55" fill={paint("inside-lit")} />
      {Array.from({ length: 7 }, (_, index) => <ellipse key={index} cx="320" cy="376" rx={207 - index * 8} ry={51 - index * 2} stroke="#ecd2a0" strokeOpacity=".065" strokeWidth=".6" />)}
      <path d="M303 326H337V349C337 355 303 355 303 349Z" fill={paint("socket")} />
      <path d="M306 336H334M306 341H334M306 346H334" stroke="#716b61" strokeWidth="1.5" />

      <ellipse data-lamp-part="halo" cx="320" cy="407" rx="75" ry="64" fill="#ffd28b" fillOpacity=".6" filter={paint("halo")} />
      <path d="M306 351C306 371 291 372 291 399C291 423 310 447 320 447C330 447 349 423 349 399C349 372 334 371 334 351Z" fill={paint("glass")} stroke="#d0c4ab" strokeOpacity=".4" strokeWidth="1.2" />
      <path data-lamp-part="glass-light" d="M306 351C306 371 291 372 291 399C291 423 310 447 320 447C330 447 349 423 349 399C349 372 334 371 334 351Z" fill={paint("warm-glass")} stroke="#ffdda0" strokeOpacity=".6" />
      <path d="M307 369C299 382 297 392 299 407M341 385C345 404 335 426 327 434" stroke="#fff8e8" strokeOpacity=".42" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M318 352V430M323 352V428" stroke="#b5a27f" strokeOpacity=".5" strokeWidth="1" />
      <path data-lamp-part="filament-glow" d="M309 361V409Q310 416 314 409V363M325 363V409Q330 417 331 407V361" stroke="#ffcf76" strokeWidth="8" filter={paint("filament")} />
      <path data-lamp-part="filament" d="M309 361V409Q310 416 314 409V363M325 363V409Q330 417 331 407V361" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M291 410Q320 437 349 410" stroke="#e0ceb0" strokeOpacity=".25" strokeWidth=".8" />
    </svg>
  );
}
