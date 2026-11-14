/** Shader materials for bodies that need more than a textured standard sphere. */
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  ShaderMaterial,
  Texture,
  Vector3,
} from 'three';

export const RING_INNER = 1.2;
export const RING_OUTER = 2.3;
const VERT = `varying vec2 vUv;varying vec3 vN;varying vec3 vW;
void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;

/** Light direction uniform is world-space and points from the body towards the Sun. */
export const lightUniform = () => ({ value: new Vector3(-0.5, 0.35, 0.8) });

export function earthMaterial(t: {
  day: Texture;
  night: Texture;
  clouds: Texture;
  normal: Texture;
  ocean: Texture;
}) {
  return new ShaderMaterial({
    uniforms: {
      day: { value: t.day },
      night: { value: t.night },
      clouds: { value: t.clouds },
      normalMap: { value: t.normal },
      oceanMap: { value: t.ocean },
      time: { value: 0 },
      uLight: lightUniform(),
    },
    vertexShader: `varying vec3 tangent;${VERT.replace('vUv=uv;', 'vUv=uv;float phi=uv.x*6.2831853;tangent=normalize(mat3(modelMatrix)*vec3(sin(phi),0.,cos(phi)));')}`,
    fragmentShader: `uniform sampler2D day;uniform sampler2D night;uniform sampler2D clouds;uniform sampler2D normalMap;uniform sampler2D oceanMap;uniform float time;uniform vec3 uLight;
varying vec2 vUv;varying vec3 vN;varying vec3 vW;varying vec3 tangent;
void main(){
  vec3 N0=normalize(vN),T=normalize(tangent),B=normalize(cross(N0,T));
  vec3 detail=texture2D(normalMap,vUv).rgb*2.-1.;
  vec3 N=normalize(T*detail.x*.35+B*detail.y*.35+N0*detail.z);
  vec3 L=normalize(uLight),V=normalize(cameraPosition-vW);
  float d=dot(N,L),dg=dot(N0,L);
  vec3 surface=texture2D(day,vUv).rgb;
  float ocean=texture2D(oceanMap,vUv).r;
  vec2 cuv=vUv+vec2(time*(1./140.-1./120.),0.);
  float cloud=texture2D(clouds,cuv).a;
  // cloud shadow: sample displaced away from the light along the surface
  float shade=texture2D(clouds,cuv+vec2(.004,-.003)*(dg>0.?1.:0.)).a;
  float lit=smoothstep(-.02,.22,dg)*max(d,0.)*1.05;
  vec3 c=surface*(.012+lit)*(1.-shade*.22);
  float spec=pow(max(dot(reflect(-L,N),V),0.),70.);
  c+=vec3(.75,.88,1.)*spec*ocean*.38*smoothstep(0.,.1,dg);
  float nightMask=1.-smoothstep(-.12,.1,dg);
  c+=texture2D(night,vUv).rgb*nightMask*.75;
  float twilight=exp(-pow(dg/.09,2.))*.5;
  c+=vec3(.55,.22,.1)*twilight*.07*(1.-cloud*.5);
  float rim=pow(1.-max(dot(N0,V),0.),3.);
  c+=vec3(.03,.2,.42)*rim*smoothstep(-.3,.35,dg)*.8;
  gl_FragColor=vec4(c,1.);
  #include <colorspace_fragment>
}`,
  });
}

export function cloudShellMaterial(map: Texture) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { map: { value: map }, uLight: lightUniform() },
    vertexShader: VERT,
    fragmentShader: `uniform sampler2D map;uniform vec3 uLight;varying vec2 vUv;varying vec3 vN;varying vec3 vW;
void main(){float a=texture2D(map,vUv).a;float dg=dot(normalize(vN),normalize(uLight));
float l=smoothstep(-.05,.3,dg);gl_FragColor=vec4(vec3(1.,.98,.95)*(.02+l*.95),a*.62*(.15+.85*l));
#include <colorspace_fragment>
}`,
  });
}

/** Animated emissive photosphere: scrolling, domain-warped imagery with limb darkening. */
export function sunMaterial(map: Texture) {
  return new ShaderMaterial({
    uniforms: { map: { value: map }, time: { value: 0 } },
    vertexShader: VERT,
    fragmentShader: `uniform sampler2D map;uniform float time;varying vec2 vUv;varying vec3 vN;varying vec3 vW;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){
  vec2 w=vec2(vn(vUv*vec2(24.,12.)+time*.05),vn(vUv*vec2(24.,12.)-time*.04+7.))-.5;
  vec2 uv=vUv+w*.02+vec2(time*.0015,0.);
  vec3 base=texture2D(map,uv).rgb;
  float gran=vn(vUv*vec2(180.,90.)+time*.18)*.6+vn(vUv*vec2(420.,210.)-time*.25)*.4;
  vec3 c=base*(.82+.45*gran);
  float mu=max(dot(normalize(vN),normalize(cameraPosition-vW)),0.);
  float limb=.35+.65*pow(mu,.55);
  c*=limb*1.35;
  c=mix(c,c*vec3(1.,.72,.42),1.-mu);
  gl_FragColor=vec4(c,1.);
  #include <colorspace_fragment>
}`,
  });
}

/** Thin additive atmosphere/corona rim. */
export function rimMaterial(tint: string, power: number, strength: number) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: {
      tint: { value: new Color(tint) },
      uLight: lightUniform(),
      uLit: { value: tint ? 1 : 0 },
    },
    vertexShader: `varying vec3 n;varying vec3 v;varying vec3 wn;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);wn=normalize(mat3(modelMatrix)*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
    fragmentShader: `uniform vec3 tint;uniform vec3 uLight;uniform float uLit;varying vec3 n;varying vec3 v;varying vec3 wn;
void main(){float f=pow(1.-abs(dot(normalize(n),normalize(v))),${power.toFixed(1)});
float l=uLit>1.5?1.:smoothstep(-.35,.4,dot(normalize(wn),normalize(uLight)));
gl_FragColor=vec4(tint,f*${strength.toFixed(3)}*l);}`,
  });
}
export const setRimUnlit = (m: ShaderMaterial) => (m.uniforms.uLit.value = 2);

/** Saturn globe with the ring plane's shadow cast across it. */
export function saturnBodyMaterial(map: Texture, rings: Texture) {
  return new ShaderMaterial({
    uniforms: {
      map: { value: map },
      rings: { value: rings },
      uLight: lightUniform(),
      uCenter: { value: new Vector3() },
      uRingNormal: { value: new Vector3(0, 1, 0) },
    },
    vertexShader: VERT,
    fragmentShader: `uniform sampler2D map;uniform sampler2D rings;uniform vec3 uLight;uniform vec3 uCenter;uniform vec3 uRingNormal;
varying vec2 vUv;varying vec3 vN;varying vec3 vW;
void main(){
  vec3 N=normalize(vN),L=normalize(uLight),V=normalize(cameraPosition-vW);
  float d=max(dot(N,L),0.);
  float shadow=0.;
  float dn=dot(L,uRingNormal);
  if(abs(dn)>.001){
    float t=-dot(vW-uCenter,uRingNormal)/dn;
    if(t>0.){
      vec3 hit=vW+L*t-uCenter;float r=length(hit);
      float u=(r-${RING_INNER.toFixed(2)})/${(RING_OUTER - RING_INNER).toFixed(2)};
      if(u>0.&&u<1.)shadow=texture2D(rings,vec2(u,.5)).a*.85;
    }
  }
  vec3 c=texture2D(map,vUv).rgb*(.015+d*1.02*(1.-shadow));
  float rim=pow(1.-max(dot(N,V),0.),3.);
  c+=vec3(.55,.5,.38)*rim*.12*smoothstep(-.2,.4,dot(N,L));
  gl_FragColor=vec4(c,1.);
  #include <colorspace_fragment>
}`,
  });
}

/** Ring plane lives in local XY; light and body centre are supplied in ring-local space. */
export function ringMaterial(rings: Texture) {
  return new ShaderMaterial({
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    uniforms: { rings: { value: rings }, uLight: lightUniform() },
    vertexShader: `varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D rings;uniform vec3 uLight;varying vec3 p;
void main(){
  float r=length(p.xy);
  float u=(r-${RING_INNER.toFixed(2)})/${(RING_OUTER - RING_INNER).toFixed(2)};
  vec4 t=texture2D(rings,vec2(clamp(u,0.,1.),.5));
  vec3 L=normalize(uLight);float b=dot(p,L);
  float shadow=step(b,0.)*smoothstep(-.03,.03,b*b-dot(p,p)+1.);
  float lit=mix(1.,.06,shadow);
  float a=t.a*step(0.,u)*step(u,1.)*.96;
  gl_FragColor=vec4(t.rgb*1.05*lit*(.35+.65*smoothstep(-.1,.3,abs(L.z)+.2)),a);
  #include <colorspace_fragment>
}`,
  });
}
