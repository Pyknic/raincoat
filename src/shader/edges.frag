#version 300 es
precision highp float;
precision mediump sampler2DShadow;

in vec2 vTexCoord;

uniform sampler2D u_position;
uniform sampler2D u_normal;
uniform sampler2DShadow u_shadowMap;

uniform mat4 u_view;
uniform mat4 u_shadowMatrix;
uniform vec3 u_lightDirection;
uniform float u_shadowBias;
uniform float u_sampleDist;

layout(location=0) out vec4 fbEdges;

vec2 poissonDisk[4] = vec2[](
    vec2(-0.94201624, -0.39906216),
    vec2(0.94558609, -0.76890725),
    vec2(-0.094184101, -0.92938870),
    vec2(0.34495938, 0.29387760)
);

void main() {
    ivec2 at = ivec2(vTexCoord * vec2(320, 180));

    vec3 pos = (texelFetch(u_position, at, 0)).xyz;
    vec3 a = (texelFetch(u_position, at + ivec2(-1, 0), 0)).xyz;
    vec3 b = (texelFetch(u_position, at + ivec2(0, -1), 0)).xyz;
    vec3 c = (texelFetch(u_position, at + ivec2(1, 0), 0)).xyz;
    vec3 d = (texelFetch(u_position, at + ivec2(0, 1), 0)).xyz;

    vec3 norm = (texelFetch(u_normal, at, 0)).xyz;
    vec3 an = (texelFetch(u_normal, at + ivec2(-1, 0), 0)).xyz;
    vec3 bn = (texelFetch(u_normal, at + ivec2(0, -1), 0)).xyz;
    vec3 cn = (texelFetch(u_normal, at + ivec2(1, 0), 0)).xyz;
    vec3 dn = (texelFetch(u_normal, at + ivec2(0, 1), 0)).xyz;

    //
    // Edge Detection
    //

    float a_dot = 1.0 - step(0.4, dot(norm, an));
    float b_dot = 1.0 - step(0.4, dot(norm, bn));
    float c_dot = 1.0 - step(0.4, dot(norm, cn));
    float d_dot = 1.0 - step(0.4, dot(norm, dn));

    float yFactor = 2.;
    float a_above = step(0.05, (pos.z + pos.y*yFactor) - (a.z + a.y*yFactor)); // Left
    float b_above = step(0.08, (pos.z + pos.y*yFactor) - (b.z + b.y*yFactor)); // Above
    float c_above = step(0.08, (pos.z + pos.y*yFactor) - (c.z + c.y*yFactor)); // Right
    float d_above = step(0.02, (pos.z + pos.y*yFactor) - (d.z + d.y*yFactor)); // Below

    float zEdge = a_above + b_above + c_above + d_above;
    float normEdge = a_dot + b_dot + c_dot + d_dot;

    //
    // Shadow Mapping
    //
    vec4 posInShadowMap = u_shadowMatrix * vec4(pos, 1.0);
    //float shadowDot = max(u_shadowBias * (1.0 - dot(norm, u_lightDirection)), 0.00001);
    posInShadowMap.y += u_shadowBias;

    float visibility = textureProj(u_shadowMap, posInShadowMap, u_sampleDist);
    visibility *= step(0.0, dot(-u_lightDirection, norm));
//    for (int i = 0; i < 4; i++) {
//        visibility += 0.2 * textureProj(u_shadowMap, posInShadowMap + vec4(poissonDisk[i] * u_sampleDist, 0.0, 0.0));
//    }
//    visibility = step(0.7, visibility);

    fbEdges = vec4(zEdge, visibility, 0.0, 1.0);

    /*
    vec3 shadowPos = posInShadowMap.xyz / posInShadowMap.w;
    float currentDepth = shadowPos.z + u_shadowBias;

    bool inRange =
        shadowPos.x >= 0.0 &&
        shadowPos.x <= 1.0 &&
        shadowPos.y >= 0.0 &&
        shadowPos.y <= 1.0;

    float shadowDepth = 0.2 * texture(u_shadowMap, shadowPos.xy).r;
    shadowDepth += 0.2 * texture(u_shadowMap, shadowPos.xy + vec2(u_sampleDist / -320.0, u_sampleDist / -180.0)).r;
    shadowDepth += 0.2 * texture(u_shadowMap, shadowPos.xy + vec2(u_sampleDist / 320.0, u_sampleDist / -180.0)).r;
    shadowDepth += 0.2 * texture(u_shadowMap, shadowPos.xy + vec2(u_sampleDist / -320.0, u_sampleDist / 180.0)).r;
    shadowDepth += 0.2 * texture(u_shadowMap, shadowPos.xy + vec2(u_sampleDist / 320.0, u_sampleDist / 180.0)).r;

    float shadowLight = (inRange && (shadowDepth <= currentDepth)) ? 0.0 : 1.0;

    fbEdges = vec4(zEdge, shadowLight, 0.0, 1.0);*/
}
