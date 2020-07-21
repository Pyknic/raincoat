#version 300 es

layout(location=0) in vec4 a_POSITION;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;

out float v_dist;

void main() {
    gl_Position = u_projection * u_view * u_world * a_POSITION;
    v_dist = gl_Position.z / gl_Position.w;
}
