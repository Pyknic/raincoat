#version 300 es
precision highp float;

uniform sampler2D u_composed;

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
    fragColor = texture(u_composed, vTexCoord);
}
