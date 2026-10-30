export const icons={
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
 pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 heart:'<path d="M20.5 4.8a5.5 5.5 0 0 0-8.5 1 5.5 5.5 0 0 0-8.5 7L12 21l8.5-8.2a5.5 5.5 0 0 0 0-8Z"/>',
 chat:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z"/><path d="M7 9h9m-9 5h6"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v5m10-5v5M3 11h18m-13 4h2m4 0h2"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
 plus:'<path d="M12 4v16M4 12h16"/>',
 check:'<path d="m5 12 4 4L20 5"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 camera:'<rect x="2" y="7" width="15" height="13" rx="3"/><path d="m17 11 5-3v11l-5-3M6 7l2-4h5l2 4"/><circle cx="9.5" cy="13.5" r="3"/>',
 light:'<path d="m8 2-4 12h7l-2 8 11-14h-8l2-6"/>',
 audio:'<rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
 sliders:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 lens:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m5 6 4 4m6 5 4 4"/>',
 tripod:'<path d="M12 9v12M12 9 3 21M12 9l9 12M8 3h8v6H8z"/>',
 box:'<path d="m3 7 9-5 9 5v11l-9 4-9-4V7Zm0 0 9 5 9-5M12 12v10M7 4l10 6"/>',
 shield:'<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Z"/><path d="m8 12 3 3 5-6"/>'
};
export const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.box}</svg>`;
export function art(kind='camera'){
const shapes={
camera:'<path d="M105 70h72l15 17h33v89H87V90h18z" fill="#303835"/><rect x="92" y="91" width="120" height="77" rx="10" fill="#454d47"/><rect x="104" y="58" width="86" height="12" rx="5" fill="#272f2d"/><path d="M112 70V55h67v15" fill="none" stroke="#29312e" stroke-width="8"/><circle cx="180" cy="133" r="49" fill="#252c2b"/><circle cx="180" cy="133" r="36" fill="#3b4543" stroke="#7f8a7e" stroke-width="3"/><circle cx="180" cy="133" r="26" fill="#172a2b"/><circle cx="180" cy="133" r="15" fill="#385952"/><path d="m167 121 20 18" stroke="#799b8b" stroke-width="5" opacity=".6"/><circle cx="108" cy="103" r="4" fill="#d98664"/>',
light:'<path d="M177 136v64m0-13-41 21m41-21 39 21" stroke="#333e39" stroke-width="5"/><path d="m179 114 36 16-7 35-39-8" fill="#303a35"/><path d="m112 49 65-10 44 47-11 58-58 25-49-39-8-49Z" fill="#353f38"/><path d="m118 56 55-7 38 39-11 48-46 23-42-32-8-43Z" fill="#f8f3de"/><path d="m118 56 36 57 57-25m-99 39 42-14 46 23m-27-87-19 64v46" stroke="#d7d5c5" stroke-width="1.5"/>',
lens:'<g transform="rotate(-24 165 120)"><rect x="100" y="62" width="127" height="113" rx="18" fill="#333b36"/><path d="M112 62v113m8-113v113m8-113v113m8-113v113m8-113v113" stroke="#747970" stroke-width="2"/><rect x="146" y="66" width="49" height="105" fill="#202b27"/><path d="M158 72v92m6-92v92m6-92v92m6-92v92m6-92v92" stroke="#4c584c" stroke-width="2"/><ellipse cx="219" cy="119" rx="22" ry="57" fill="#1f2927"/><ellipse cx="222" cy="119" rx="15" ry="43" fill="#547267"/><ellipse cx="225" cy="119" rx="10" ry="31" fill="#203e3c"/><path d="M211 92q20 20 2 50" stroke="#829e89" stroke-width="3" fill="none"/></g>',
audio:'<g transform="rotate(-13 160 120)"><rect x="125" y="59" width="75" height="141" rx="14" fill="#353d39"/><rect x="139" y="82" width="47" height="39" rx="3" fill="#b2c7ae"/><path d="M146 111v-11m7 11V93m7 18V96m7 15V90m7 21V96" stroke="#4d6657" stroke-width="3"/><circle cx="162" cy="151" r="16" fill="#242f2a"/><circle cx="162" cy="151" r="7" fill="#d2785a"/><circle cx="141" cy="180" r="4" fill="#8c968a"/><circle cx="162" cy="180" r="4" fill="#8c968a"/><circle cx="183" cy="180" r="4" fill="#8c968a"/><path d="m145 65-17-25m47 25 17-25" stroke="#4e5952" stroke-width="12"/><path d="m118 39 20-12m44 0 20 12" stroke="#7e897d" stroke-width="16"/></g>',
tripod:'<path d="M163 91v114m0-114-65 114m65-114 65 114" stroke="#455047" stroke-width="8"/><path d="M163 148v57m-35-59-30 59m100-59 30 59" stroke="#90998a" stroke-width="5"/><rect x="144" y="61" width="39" height="39" rx="6" fill="#344139"/><rect x="137" y="51" width="54" height="13" rx="3" fill="#25372e"/><path d="m179 76 53-13" stroke="#344139" stroke-width="6"/><circle cx="161" cy="82" r="5" fill="#ba7755"/>',
reflector:'<ellipse cx="164" cy="122" rx="76" ry="85" transform="rotate(22 164 122)" fill="#d4b76b" stroke="#424e40" stroke-width="9"/><path d="M157 42q-54 80-41 146" fill="none" stroke="#f8e4a5" stroke-width="3" opacity=".5"/><ellipse cx="164" cy="122" rx="60" ry="70" transform="rotate(22 164 122)" fill="none" stroke="#eed699" stroke-width="2"/>'
};
return `<svg class="product-art" viewBox="0 0 330 240" aria-hidden="true"><ellipse cx="165" cy="214" rx="82" ry="10" fill="#182b21" opacity=".09"/>${shapes[kind]||shapes.camera}</svg>`;
}
