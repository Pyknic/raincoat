#version 300 es
precision highp float;

//uniform sampler2D uDiffuse;

/*layout(std140) uniform SceneUniforms {
    mat4 uPerspectiveView;
};*/

//in vec2 vTexCoord;
in vec3 v_normal;

uniform vec4 u_diffuse;
uniform vec3 u_lightDirection;

out vec4 outColor;

void main() {
    vec3 normal = normalize(v_normal);
    float light = dot(u_lightDirection, normal) * .5 + .5;
    //outColor = texture(uDiffuse, vTexCoord);
    outColor = vec4(u_diffuse.rgb * light, u_diffuse.a);
}
