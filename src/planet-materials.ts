/**
 * Shader materials for every drawn body. All write linear HDR radiance and end
 * with three's tone-mapping and colour-space chunks, so they work both through
 * the HDR post chain (where those chunks are inert) and direct to the canvas.
 */
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  FrontSide,
  Matrix3,
  ShaderMaterial,
  Texture,
  Vector3,
} from 'three';
import type { WorldLook } from './worlds';

export const RING_INNER = 1.2;
export const RING_OUTER = 2.3;

/** Light direction uniform is world-space and points from the body towards its light. */
export const lightUniform = () => ({ value: new Vector3(-0.5, 0.35, 0.8) });

const OUTPUT = `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>`;

const NOISE = `
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+17.1;a*=.5;}return s;}`;

/** World-space normal, east tangent (+U) and position for UV spheres, scale-correct. */
const VERT = `varying vec2 vUv;varying vec3 vN;varying vec3 vW;varying vec3 vT;
void main(){
  vUv=uv;mat3 m=mat3(modelMatrix);
  vN=normalize(transpose(inverse(m))*normal);
  float phi=uv.x*6.2831853;vT=normalize(m*vec3(sin(phi),0.,cos(phi)));
  vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;
  gl_Position=projectionMatrix*viewMatrix*w;
}`;

/** Tangent frame and Saturn's ring shadow, shared by surfaces. */
const FRAME = `
vec3 tangentNormal(vec3 N0,vec3 Tr,vec3 d){
  vec3 T=normalize(Tr-N0*dot(N0,Tr)),B=cross(N0,T);
  return normalize(T*d.x+B*d.y+N0*d.z);
}`;
const RING_SHADOW = `
uniform sampler2D rings;uniform vec3 uCenter;uniform vec3 uRingNormal;
float ringShadow(vec3 p,vec3 L){
  float dn=dot(L,uRingNormal);
  if(abs(dn)<.001)return 0.;
  float t=-dot(p-uCenter,uRingNormal)/dn;
  if(t<=0.)return 0.;
  float r=length(p+L*t-uCenter);
  float u=(r-${RING_INNER.toFixed(2)})/${(RING_OUTER - RING_INNER).toFixed(2)};
  return u>0.&&u<1.?texture2D(rings,vec2(u,.5)).a*.9:0.;
}`;

const v3 = (c: [number, number, number]) => new Vector3(...c);

export interface SurfaceTextures {
  map: Texture;
  normal?: Texture;
  rings?: Texture;
}

/**
 * Rocky, cloud-deck and gas-giant surfaces.
 * - rock: Lommel–Seeliger/Lambert blend, so the Moon reads as a bright, evenly lit
 *   disc with crisp shadows at the terminator rather than a plastic ball.
 * - cloud: soft, wrapped terminator of an opaque cloud deck (Venus).
 * - giant: mild limb darkening and a soft terminator, slow differential band drift.
 */
export function surfaceMaterial(look: WorldLook, t: SurfaceTextures) {
  const defines: Record<string, string> = {
    [look.surface.toUpperCase()]: '',
  };
  if (t.normal) defines.NORMAL_MAP = '';
  if (look.albedoRelief) defines.ALBEDO_RELIEF = '';
  if (look.bandDrift) defines.BAND_DRIFT = '';
  if (look.detail) defines.DETAIL = '';
  if (t.rings) defines.RINGS = '';
  if (look.atmosphere) defines.HAZE = '';
  const haze = look.atmosphere;
  return new ShaderMaterial({
    defines,
    uniforms: {
      map: { value: t.map },
      normalMap: { value: t.normal ?? null },
      rings: { value: t.rings ?? null },
      uLight: lightUniform(),
      uSun: { value: look.sun },
      uAmbient: { value: v3(look.ambient) },
      uRelief: { value: look.relief ?? look.albedoRelief ?? 0 },
      uBandDrift: { value: look.bandDrift ?? 0 },
      uDetail: { value: look.detail ?? 0 },
      uHaze: { value: v3(haze?.limb ?? [0, 0, 0]) },
      uHazeStrength: { value: haze?.limbStrength ?? 0 },
      uCenter: { value: new Vector3() },
      uRingNormal: { value: new Vector3(0, 1, 0) },
      time: { value: 0 },
    },
    vertexShader: VERT,
    fragmentShader: `uniform sampler2D map;uniform sampler2D normalMap;uniform vec3 uLight;uniform float uSun;
uniform vec3 uAmbient;uniform float uRelief;uniform float uBandDrift;uniform float uDetail;uniform vec3 uHaze;
uniform float uHazeStrength;uniform float time;
varying vec2 vUv;varying vec3 vN;varying vec3 vW;varying vec3 vT;
${NOISE}${FRAME}
#ifdef RINGS
${RING_SHADOW}
#endif
void main(){
  vec3 N0=normalize(vN),V=normalize(cameraPosition-vW),L=normalize(uLight);
  vec2 uv=vUv;
  #ifdef BAND_DRIFT
    float lat=(uv.y-.5)*3.14159;
    uv.x+=time*uBandDrift*(1.+.35*sin(lat*11.)+.2*sin(lat*23.));
  #endif
  vec3 albedo=texture2D(map,uv).rgb;
  vec3 N=N0;
  #ifdef NORMAL_MAP
    vec3 d=texture2D(normalMap,uv).rgb*2.-1.;
    d.xy*=uRelief;
    N=tangentNormal(N0,vT,d);
  #endif
  #ifdef ALBEDO_RELIEF
    // No elevation data: brightness slopes stand in for relief.
    vec2 e=vec2(1.5/4096.,0.),f=vec2(0.,1.5/2048.);
    float lx=dot(texture2D(map,uv+e).rgb-texture2D(map,uv-e).rgb,vec3(.33));
    float ly=dot(texture2D(map,uv+f).rgb-texture2D(map,uv-f).rgb,vec3(.33));
    N=tangentNormal(N0,vT,normalize(vec3(-lx*uRelief*6.,-ly*uRelief*6.,1.)));
  #endif
  #ifdef DETAIL
    float lat2=(vUv.y-.5)*3.14159;
    float streak=fbm(vec2(uv.x*40.,uv.y*260.)+vec2(time*.002,0.));
    albedo*=1.+uDetail*(streak-.5)*2.+uDetail*.6*sin(lat2*18.+fbm(uv*vec2(8.,30.))*3.);
  #endif
  float g=dot(N0,L),mu0=dot(N,L),mu=max(dot(N0,V),.0);
  float light;
  #if defined(ROCK)
    float m0=max(mu0,0.);
    float ls=2.*m0/(m0+mu+1e-3);
    light=mix(m0,ls*.5,.6)*smoothstep(-.03,.05,g);
  #elif defined(CLOUD)
    light=pow(clamp((mu0+.18)/1.18,0.,1.),1.4)*(.82+.18*mu);
  #else
    light=smoothstep(-.06,.5,mu0)*max(mu0+.06,0.)/1.06*(.62+.38*pow(mu,.35));
  #endif
  #ifdef RINGS
    light*=1.-ringShadow(vW,L);
  #endif
  vec3 c=albedo*(light*uSun+uAmbient);
  #ifdef HAZE
    float rim=pow(1.-mu,3.);
    c=mix(c,uHaze*uSun*.55*smoothstep(-.25,.45,g),rim*uHazeStrength);
  #endif
  gl_FragColor=vec4(c,1.);
  ${OUTPUT}
}`,
  });
}

export function earthMaterial(t: {
  day: Texture;
  night: Texture;
  clouds: Texture;
  normal: Texture;
  ocean: Texture;
  look: WorldLook;
}) {
  return new ShaderMaterial({
    uniforms: {
      day: { value: t.day },
      night: { value: t.night },
      clouds: { value: t.clouds },
      normalMap: { value: t.normal },
      oceanMap: { value: t.ocean },
      time: { value: 0 },
      uCloudShift: { value: 0 },
      uLight: lightUniform(),
      uSun: { value: t.look.sun },
    },
    vertexShader: VERT,
    fragmentShader: `uniform sampler2D day;uniform sampler2D night;uniform sampler2D clouds;uniform sampler2D normalMap;
uniform sampler2D oceanMap;uniform float time;uniform float uCloudShift;uniform vec3 uLight;uniform float uSun;
varying vec2 vUv;varying vec3 vN;varying vec3 vW;varying vec3 vT;
${FRAME}
void main(){
  vec3 N0=normalize(vN),V=normalize(cameraPosition-vW),L=normalize(uLight);
  vec3 T=normalize(vT-N0*dot(N0,vT)),B=cross(N0,T);
  vec3 dn=texture2D(normalMap,vUv).rgb*2.-1.;
  vec3 N=normalize(T*dn.x*.45+B*dn.y*.45+N0*dn.z);
  float g=dot(N0,L),d=dot(N,L),mu=max(dot(N0,V),0.);
  vec3 surface=texture2D(day,vUv).rgb;
  float ocean=texture2D(oceanMap,vUv).r;
  vec2 cuv=vUv+vec2(uCloudShift,0.);
  float cloud=texture2D(clouds,cuv).r;
  // Clouds cast their shadow away from the light, offset along the surface.
  vec2 toward=vec2(dot(L,T),dot(L,B))*.0045;
  float shade=texture2D(clouds,cuv+toward).r;
  float lit=max(d,0.)*smoothstep(-.06,.12,g);
  vec3 c=surface*lit*uSun*(1.-shade*.5);
  // Sun glint: GGX highlight with Fresnel, on open ocean only.
  vec3 H=normalize(L+V);float nh=max(dot(N0,H),0.),a2=.035;
  float D=a2/(3.14159*pow(nh*nh*(a2-1.)+1.,2.));
  float F=.02+.98*pow(1.-max(dot(H,V),0.),5.);
  c+=vec3(1.,.93,.8)*uSun*ocean*D*F*max(g,0.)*.35*(1.-cloud);
  // City lights on the night side, dimmed under cloud.
  float nightMask=1.-smoothstep(-.12,.06,g);
  vec3 lights=texture2D(night,vUv).rgb;
  c+=lights*lights*vec3(1.,.82,.55)*nightMask*(1.-cloud*.85)*1.8;
  // Aerial perspective: blue haze thickens toward the limb; warm at the terminator.
  float haze=pow(1.-mu,2.2);
  c=mix(c,vec3(.24,.46,1.)*uSun*.5*smoothstep(-.15,.4,g),haze*.6);
  c+=vec3(1.,.42,.16)*exp(-pow((g-.02)/.07,2.))*haze*.05*uSun;
  gl_FragColor=vec4(c,1.);
  ${OUTPUT}
}`,
  });
}

/** Cloud deck with self-shading tops, soft terminator and a warm sunset edge. */
export function cloudShellMaterial(map: Texture, look: WorldLook) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      map: { value: map },
      uLight: lightUniform(),
      uSun: { value: look.sun },
    },
    vertexShader: VERT,
    fragmentShader: `uniform sampler2D map;uniform vec3 uLight;uniform float uSun;
varying vec2 vUv;varying vec3 vN;varying vec3 vW;varying vec3 vT;
void main(){
  vec3 N0=normalize(vN),L=normalize(uLight),V=normalize(cameraPosition-vW);
  vec3 T=normalize(vT-N0*dot(N0,vT)),B=cross(N0,T);
  float a=texture2D(map,vUv).r;
  vec2 toward=vec2(dot(L,T),dot(L,B))*.0016;
  float bump=a-texture2D(map,vUv+toward).r;
  float g=dot(N0,L),mu=max(dot(N0,V),0.);
  float l=smoothstep(-.08,.3,g)*(.78+.5*bump);
  vec3 tint=mix(vec3(1.,.55,.32),vec3(1.,.99,.97),smoothstep(-.02,.22,g));
  vec3 c=tint*l*uSun*.92;
  float alpha=smoothstep(.08,.75,a)*.95*(1.-pow(1.-mu,6.)*.4);
  gl_FragColor=vec4(c,alpha);
  ${OUTPUT}
}`,
  });
}

/**
 * Single-scattering atmosphere shell, integrated along each view ray. Rayleigh-like
 * colour scattering plus forward-scattering haze; light paths use an analytic
 * optical-depth approximation. Works in the body's local, flattening-corrected
 * frame so oblate giants keep a uniform limb.
 */
/** `steps` trades integration accuracy for cost; the low tier uses fewer. */
export function atmosphereMaterial(look: WorldLook, steps = 14) {
  const a = look.atmosphere!;
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: FrontSide,
    uniforms: {
      uLight: lightUniform(),
      uCenter: { value: new Vector3() },
      uToLocal: { value: new Matrix3() },
      uScatter: { value: v3(a.scatter) },
      uHaze: { value: a.haze },
      uG: { value: a.forward },
      uHeight: { value: a.height },
      uTop: { value: a.top },
      uSunI: { value: a.sun },
    },
    vertexShader: `varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform vec3 uLight;uniform vec3 uCenter;uniform mat3 uToLocal;uniform vec3 uScatter;uniform float uHaze;
uniform float uG;uniform float uHeight;uniform float uTop;uniform float uSunI;varying vec3 vW;
vec2 sphere(vec3 o,vec3 d,float r){float b=dot(o,d),c=dot(o,o)-r*r,h=b*b-c;if(h<0.)return vec2(-1.);h=sqrt(h);return vec2(-b-h,-b+h);}
void main(){
  vec3 o=uToLocal*(cameraPosition-uCenter);
  vec3 d=normalize(uToLocal*(vW-cameraPosition));
  vec3 L=normalize(uToLocal*uLight);
  vec2 ta=sphere(o,d,uTop);
  if(ta.y<=0.)discard;
  vec2 tp=sphere(o,d,1.);
  float t0=max(ta.x,0.),t1=ta.y;
  if(tp.x>0.)t1=min(t1,tp.x);
  const int STEPS=${Math.max(4, Math.round(steps))};
  float ds=(t1-t0)/float(STEPS);
  float mu=dot(d,L),g=uG,g2=g*g;
  float pr=.0596831*(1.+mu*mu);
  float pm=.1193662*(1.-g2)*(1.+mu*mu)/((2.+g2)*pow(1.+g2-2.*g*mu,1.5));
  float hm=uHeight*.35;
  float cr=sqrt(2.*uHeight/3.14159),cm=sqrt(2.*hm/3.14159);
  vec3 sum=vec3(0.);float odR=0.,odM=0.;
  for(int i=0;i<STEPS;i++){
    vec3 p=o+d*(t0+ds*(float(i)+.5));
    float r=length(p),h=max(r-1.,0.);
    float dR=exp(-h/uHeight)*ds,dM=exp(-h/hm)*ds;
    odR+=dR*.5;odM+=dM*.5;
    float muS=dot(p/r,L);
    float lR=exp(-h/uHeight)*uHeight/(max(muS,0.)+cr);
    float lM=exp(-h/hm)*hm/(max(muS,0.)+cm);
    float vis=smoothstep(-cr*1.5,cr*.5,muS);
    vec3 tau=uScatter*(odR+lR)+vec3(uHaze*1.1)*(odM+lM);
    sum+=exp(-tau)*(dR*uScatter*pr+dM*uHaze*pm)*vis;
    odR+=dR*.5;odM+=dM*.5;
  }
  gl_FragColor=vec4(sum*uSunI,1.);
  ${OUTPUT}
}`,
  });
}

/** Animated emissive photosphere: domain-warped imagery, granulation, limb darkening. */
export function sunMaterial(map: Texture, look: WorldLook) {
  return new ShaderMaterial({
    uniforms: {
      map: { value: map },
      time: { value: 0 },
      uEmission: { value: look.emission ?? 4 },
    },
    vertexShader: VERT,
    fragmentShader: `uniform sampler2D map;uniform float time;uniform float uEmission;
varying vec2 vUv;varying vec3 vN;varying vec3 vW;varying vec3 vT;
${NOISE}
void main(){
  vec2 w=vec2(vn(vUv*vec2(24.,12.)+time*.05),vn(vUv*vec2(24.,12.)-time*.04+7.))-.5;
  vec2 uv=vUv+w*.02+vec2(time*.0015,0.);
  vec3 base=texture2D(map,uv).rgb;
  float gran=vn(vUv*vec2(220.,110.)+time*.18)*.6+vn(vUv*vec2(520.,260.)-time*.25)*.4;
  float mu=max(dot(normalize(vN),normalize(cameraPosition-vW)),0.);
  // Solar limb darkening (Eddington-like law), reddening towards the edge.
  float limb=.3+.7*pow(mu,.6);
  vec3 c=base*(.78+.5*gran)*limb;
  c=mix(c*vec3(1.,.62,.3),c,smoothstep(0.,.55,mu));
  gl_FragColor=vec4(c*uEmission,1.);
  ${OUTPUT}
}`,
  });
}

/**
 * Proxima Centauri: a small, cool M-dwarf. Deep red-orange convective cells, dark
 * starspots and a slow flare-brightened region; strong limb darkening and no yellow,
 * so it cannot be mistaken for the Sun. Procedural: no texture is required.
 */
export function proximaMaterial(look: WorldLook) {
  return new ShaderMaterial({
    uniforms: { time: { value: 0 }, uEmission: { value: look.emission ?? 3 } },
    vertexShader: VERT,
    fragmentShader: `uniform float time;uniform float uEmission;varying vec2 vUv;varying vec3 vN;varying vec3 vW;varying vec3 vT;
${NOISE}
void main(){
  vec2 q=vUv*vec2(10.,5.);
  vec2 warp=vec2(fbm(q+time*.03),fbm(q-time*.025+9.))-.5;
  float cells=fbm(q*3.+warp*2.4+vec2(time*.02,0.));
  float fine=vn(vUv*vec2(260.,130.)+time*.2);
  float spots=smoothstep(.62,.8,fbm(vUv*vec2(6.,3.)+vec2(3.1,time*.004)));
  float flare=smoothstep(.72,.9,fbm(vUv*vec2(5.,2.5)+17.+time*.01));
  vec3 deep=vec3(.42,.07,.03),mid=vec3(.95,.27,.1),hot=vec3(1.,.5,.22);
  vec3 c=mix(deep,mid,smoothstep(.25,.7,cells));
  c=mix(c,hot,smoothstep(.6,.95,cells)*.5+flare*.55);
  c*=.88+.24*fine;
  c*=1.-spots*.7;
  float mu=max(dot(normalize(vN),normalize(cameraPosition-vW)),0.);
  c*=.18+.82*pow(mu,.8);
  c=mix(c,c*vec3(.85,.45,.35),1.-mu);
  gl_FragColor=vec4(c*uEmission,1.);
  ${OUTPUT}
}`,
  });
}

/**
 * Camera-facing corona with slowly evolving streamers. The quad sits at the
 * star's centre, so the photosphere occludes it and only the halo shows.
 */
export function coronaMaterial(look: WorldLook, size: number) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uColor: { value: v3(look.corona ?? [1, 0.8, 0.5]) },
      uSize: { value: size },
      uIntensity: { value: (look.emission ?? 4) * 0.3 },
      time: { value: 0 },
    },
    vertexShader: `uniform float uSize;varying vec2 vP;
void main(){vP=position.xy*uSize;vec4 c=modelViewMatrix*vec4(0.,0.,0.,1.);
  float s=length(modelMatrix[0].xyz);c.xy+=vP*s;gl_Position=projectionMatrix*c;}`,
    fragmentShader: `uniform vec3 uColor;uniform float uSize;uniform float uIntensity;uniform float time;varying vec2 vP;
${NOISE}
void main(){
  float r=length(vP);
  if(r<.98)discard;
  float a=atan(vP.y,vP.x);
  float streamers=.55+.9*fbm(vec2(a*3.2+sin(a)*.4,r*.35-time*.008));
  streamers*=.75+.5*vn(vec2(a*14.,time*.02));
  float x=r-1.;
  float glow=exp(-x*7.)*.9+exp(-x*1.7)*.32*streamers+exp(-x*.6)*.05;
  glow*=1.-smoothstep(uSize*.7,uSize,r);
  gl_FragColor=vec4(uColor*glow*uIntensity,1.);
  ${OUTPUT}
}`,
  });
}

/**
 * Saturn's rings in local XY. Lit side shows the ring colour, scaled by phase;
 * from the unlit side, sunlight filters through, so dense rings go dark and thin
 * ones glow. The globe's shadow falls across them; edges stay anti-aliased.
 */
export function ringMaterial(rings: Texture) {
  return new ShaderMaterial({
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    uniforms: {
      rings: { value: rings },
      uLight: lightUniform(),
      uView: { value: new Vector3(0, 0, 1) },
      uSun: { value: 1.9 },
    },
    vertexShader: `varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D rings;uniform vec3 uLight;uniform vec3 uView;uniform float uSun;varying vec3 p;
void main(){
  float r=length(p.xy);
  float u=(r-${RING_INNER.toFixed(2)})/${(RING_OUTER - RING_INNER).toFixed(2)};
  float fw=fwidth(u)*1.5;
  float edge=smoothstep(0.,fw,u)*smoothstep(1.,1.-fw,u);
  vec4 t=texture2D(rings,vec2(clamp(u,0.,1.),.5));
  vec3 L=normalize(uLight);
  // Globe shadow: is the sun ray from this point blocked by the unit sphere?
  float b=dot(p,L),c=dot(p,p)-1.;
  float shadow=step(b,0.)*smoothstep(-.02,.02,b*b-c);
  float lit=1.-shadow*.94;
  vec3 V=normalize(uView-p);
  bool sameSide=sign(L.z)==sign(V.z);
  float a=t.a*edge;
  vec3 col;
  if(sameSide){
    float phase=.55+.45*max(dot(normalize(L+V),vec3(0.,0.,sign(L.z))),0.);
    col=t.rgb*lit*phase*(.35+.65*abs(L.z)+.15);
  }else{
    // Forward-scattered sunlight through the particle layer.
    col=t.rgb*(1.-t.a)*1.6*lit*abs(L.z)+t.rgb*.015;
  }
  gl_FragColor=vec4(col*uSun*.62,a*.97);
  ${OUTPUT}
}`,
  });
}

/**
 * A distant body as a point of light: brightness fades out as the real disc grows
 * past a few pixels, so worlds resolve from stars instead of cross-fading.
 */
export function glintMaterial(color: [number, number, number]) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uColor: { value: new Color(...color) },
      uWeight: { value: 1 },
      uSize: { value: 7 },
    },
    vertexShader: `uniform float uSize;void main(){gl_PointSize=uSize;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform vec3 uColor;uniform float uWeight;
void main(){vec2 q=gl_PointCoord-.5;float d=dot(q,q)*4.;float a=exp(-d*7.)+exp(-d*2.)*.08;
  gl_FragColor=vec4(uColor*a*uWeight,1.);
  ${OUTPUT}
}`,
  });
}
