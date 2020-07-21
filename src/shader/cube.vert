#version 300 es

layout(location=0) in vec4 a_POSITION;
layout(location=1) in vec3 a_NORMAL;
layout(location=2) in vec4 a_WEIGHTS_0;
layout(location=3) in uvec4 a_JOINTS_0;

//layout(location=2) in vec2 a_TEXCOORD;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;
uniform sampler2D u_jointTexture;
uniform float u_numJoints;

/*layout(std140) uniform SceneUniforms {
    mat4 uPerspectiveView;
};*/
//uniform mat4 uPerspectiveView;

//out vec2 vTexCoord;
out vec3 v_normal;

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
    /*
    vec4 pos = vec4(a_position, 1.0);
    gl_Position = uPerspectiveView * pos;
    vTexCoord = a_texcoord;
    vNormal = a_normal;
    */

    gl_Position = u_projection * u_view * world * a_POSITION;
    v_normal = mat3(world) * a_NORMAL;
}
