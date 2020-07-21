#version 300 es
precision highp float;

uniform vec4 u_color;

in float v_dist;
out vec4 outColor;

void main() {
    outColor = vec4(u_color.rgb * -v_dist, 1.0);
}
