#version 300 es
precision highp float;

in vec2 vTexCoord;

uniform sampler2D u_base;
uniform sampler2D u_position;
uniform sampler2D u_normal;
uniform sampler2D u_edges;

uniform vec3 u_lightDirection;

layout(location=0) out vec4 fbCompose;

//Sources: https://gist.github.com/yiwenl/745bfea7f04c456e0101, https://gist.github.com/sugi-cho/6a01cae436acddd72bdf
vec3 hsv2rgb(vec3 c){
    vec4 K=vec4(1.,2./3.,1./3.,3.);
    return c.z*mix(K.xxx,clamp(abs(fract(c.x+K.xyz)*6.-K.w)-K.x, 0., 1.),c.y);
}

//Source: https://gist.github.com/yiwenl/745bfea7f04c456e0101
vec3 rgb2hsv(vec3 c) {
    float cMax=max(max(c.r,c.g),c.b),
    cMin=min(min(c.r,c.g),c.b),
    delta=cMax-cMin;
    vec3 hsv=vec3(0.,0.,cMax);
    if(cMax>cMin){
        hsv.y=delta/cMax;
        if(c.r==cMax){
            hsv.x=(c.g-c.b)/delta;
        }else if(c.g==cMax){
            hsv.x=2.+(c.b-c.r)/delta;
        }else{
            hsv.x=4.+(c.r-c.g)/delta;
        }
        hsv.x=fract(hsv.x/6.);
    }
    return hsv;
}

void main() {
    ivec2 at = ivec2(vTexCoord * vec2(320, 180));
    vec4 base = texelFetch(u_base, at, 0);
    vec4 pos  = texelFetch(u_position, at, 0);
    vec4 norm = texelFetch(u_normal, at, 0);
    vec4 edge = texelFetch(u_edges, at, 0);
    vec4 edgeA = texelFetch(u_edges, at + ivec2(-1, 0), 0);
    vec4 edgeB = texelFetch(u_edges, at + ivec2(0, -1), 0);
    vec4 edgeC = texelFetch(u_edges, at + ivec2(1, 0), 0);
    vec4 edgeD = texelFetch(u_edges, at + ivec2(0, 1), 0);


    float lightDot = dot(-u_lightDirection, norm.xyz);
    //lightDot = step(0.5, lightDot) - (1.0 - step(0.0, lightDot));
    lightDot = step(0.1, lightDot) * 1.8 - 0.5;

    //float lightDot = smoothstep(0.0, 1.0, dot(-u_lightDirection, norm.xyz) * 0.5 + 0.5);



    //float diffuseAmount = clamp(lightDot, -0.5, 0.5)   * 0.25;
    //float diffuseAmount = 1.0;


    float lum = edge.r * lightDot * 0.25 + step(0.1, edge.g) * 0.25 + step(0.9, edge.b) * 0.2 + 0.6;

    vec3 hsv = rgb2hsv(base.rgb);
   // hsv.z += edge.r * diffuseAmount;
    hsv.z *= lum;

    fbCompose = vec4(hsv2rgb(hsv), 1.0);
    //fbCompose = vec4(vec3(edge.b), 1.0);
    //fbCompose = vec4(edge.rgb, 1.0);


    //fbCompose = vec4(vec3(edge.r * lightDot + edge.g * 0.5), 1.0);
    //fbCompose = vec4(hsv2rgb(hsv), 1.0);

    //fbCompose = vec4(vec3(lightDot), 1.0);

    //fbCompose = vec4(vec3(edge.g), 1.0);

    //fbCompose = vec4(vec3(edge.r), 1.0);

    //fbCompose = vec4(vec3(diffuseAmount), 1.0);
}
