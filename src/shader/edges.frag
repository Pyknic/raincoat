#version 300 es
precision highp float;
precision mediump sampler2DShadow;

in vec2 vTexCoord;

uniform sampler2D u_position;
uniform sampler2D u_normal;
uniform sampler2DShadow u_shadowMap;
uniform sampler2D u_noiseTexture;

uniform vec3 u_samples[64];
uniform mat4 u_view;
uniform mat4 u_projection;
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


//float ssaoRadius = 0.5;
//float ssaoRadius = 0.5;
//float ssaoRadius = 0.125;
float ssaoRadius = 0.5;
//float ssaoBias = 0.025;
float ssaoBias = 0.025;

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



    //
    // SSAO
    //
    vec3 randomVec = normalize((texture(u_noiseTexture, vTexCoord * vec2(16.0, 9.0))).xyz); // Tangent-Space
    vec3 viewNorm = normalize(mat3(u_view) * norm);
    //viewNorm4.xyz /= viewNorm4.w;
    //vec3 viewNorm = normalize(viewNorm4.xyz); // View Space (Normalized)

    // Create a rotation matrix around the normal using the random vector as the tangent
    // Normal is in world-space, the random vector can be in any space since it is random
    vec3 tangent = normalize(randomVec - viewNorm * dot(randomVec, viewNorm));
    vec3 bitangent = cross(viewNorm, tangent);
    mat3 TBN = mat3(tangent, bitangent, viewNorm);


    vec4 posProj = (u_projection * vec4(pos, 1.0));
    posProj.xyz / posProj.w;

    float occlusion = 0.0;
    for (int i = 0; i < 64; ++i)
    {
        // u_samples are specified in local tangent space (Z is always positive)
        // When we multiply it with TBN, it rotates the sample into the view-space tangent (Z is distance along normal,
        // XY are distances along random tangent and bi-tangent in view space).
        vec3 s = TBN * u_samples[i];

        // Scale the sample with the radius parameter and then offset it to the position of the fragment in view space.
        s = pos.xyz + s * ssaoRadius;

        // Transform the sample to clip space using the projection matrix
        vec4 s4 = (u_projection * vec4(s, 1.0));
        s4.xyz /= s4.w;

        float sampleDepth = texture(u_position, s4.xy * 0.5 + 0.5).z; // View space
        float rangeCheck = smoothstep(0.0, 1.0, ssaoRadius / abs(pos.z - sampleDepth));

        occlusion += (sampleDepth >= s.z + ssaoBias ? 1.0 : 0.0) * rangeCheck;
    }

    occlusion = 1.0 - (occlusion / 64.0);
    //fbEdges = vec4(vec3(occlusion), 1.0);
    fbEdges = vec4(zEdge, visibility, occlusion, 1.0);

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
