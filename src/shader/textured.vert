#version 300 es

layout(location=0) in vec4 a_POSITION;
layout(location=1) in vec3 a_NORMAL;
layout(location=2) in vec2 a_TEXCOORD_0;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;

out vec3 v_position;
out vec3 v_normal;
out vec2 v_texCoord;

void main() {
    vec4 pos = u_view * u_world * a_POSITION;

    gl_Position = u_projection * pos;
    v_position = pos.xyz / pos.w;
    v_normal = mat3(u_world) * normalize(a_NORMAL);
    v_texCoord = a_TEXCOORD_0;
}
