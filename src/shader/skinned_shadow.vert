#version 300 es

layout(location=0) in vec4 a_POSITION;
layout(location=1) in vec3 a_NORMAL;
layout(location=2) in vec2 a_TEXCOORD_0;
layout(location=3) in vec4 a_WEIGHTS_0;
layout(location=4) in uvec4 a_JOINTS_0;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;
uniform sampler2D u_jointTexture;
uniform float u_numJoints;

out float v_dist;

mat4 getBoneMatrix(uint jointIdx) {
    return mat4(
        texelFetch(u_jointTexture, ivec2(0, jointIdx), 0),
        texelFetch(u_jointTexture, ivec2(1, jointIdx), 0),
        texelFetch(u_jointTexture, ivec2(2, jointIdx), 0),
        texelFetch(u_jointTexture, ivec2(3, jointIdx), 0)
    );
}

void main() {
    mat4 skinMatrix =
        getBoneMatrix(a_JOINTS_0[0]) * a_WEIGHTS_0[0] +
        getBoneMatrix(a_JOINTS_0[1]) * a_WEIGHTS_0[1] +
        getBoneMatrix(a_JOINTS_0[2]) * a_WEIGHTS_0[2] +
        getBoneMatrix(a_JOINTS_0[3]) * a_WEIGHTS_0[3];

    mat4 world = u_world * skinMatrix;
    vec4 pos = u_view * world * a_POSITION;

    gl_Position = u_projection * pos;
    v_dist = gl_Position.z / gl_Position.w;
}
