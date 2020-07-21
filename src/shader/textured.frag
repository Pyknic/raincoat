#version 300 es
precision highp float;

in vec3 v_position;
in vec3 v_normal;
in vec2 v_texCoord;

uniform vec4 u_diffuse;

uniform sampler2D u_baseColorTexture;

layout(location=0) out vec4 fbBase;
layout(location=1) out vec4 fbPosition;
layout(location=2) out vec4 fbNormal;

void main() {
    vec3 normal = normalize(v_normal);

    vec3 baseColor = texture(u_baseColorTexture, v_texCoord).rgb;

    fbBase     = vec4(baseColor, 1.0);
    fbPosition = vec4(v_position, 1.0);
    fbNormal   = vec4(normal, 1.0);
}
