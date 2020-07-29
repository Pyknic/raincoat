#version 300 es
precision highp float;

in vec2 vTexCoord;

uniform sampler2D u_edges;
uniform sampler2D u_position;

layout(location=0) out vec4 fbEdgesBlurred;

const int BLUR_SIZE = 5;
const int BLUR_SAMPLES = BLUR_SIZE * BLUR_SIZE;
const float BLUR_FACTOR = 1.0 / float(BLUR_SAMPLES);

const float G = 1.0 / 273.0;
const float[] BLUR_KERNEL = float[](
    G*1.,  G*4.,  G*7., G*4.,  G*1.,
    G*4., G*16., G*26., G*16., G*4.,
    G*7., G*26., G*41., G*26., G*7.,
    G*4., G*16., G*26., G*16., G*4.,
    G*1.,  G*4.,  G*7., G*4.,  G*1.
);

const float BLUR_RADIUS = 0.125;
const float BLUR_RADIUS_SQR = BLUR_RADIUS * BLUR_RADIUS;

void main() {
    ivec2 at = ivec2(vTexCoord * vec2(320, 180));
    vec4 edges = texelFetch(u_edges, at, 0).xyzw;

    vec3 centerPos = (texelFetch(u_position, at, 0)).xyz;

    // Gaussian Blur (Can be optimized)
    float blur = 0.0;
    float samples = 0.0;
    for (int i = -2; i <= 2; i++) { // Rows
        for (int j = -2; j <= 2; j++) { // Columns
            int k = (2 + i) * 5 + (j + 2);
            ivec2 offset = clamp(at + ivec2(j, i), ivec2(0, 0), ivec2(319, 179));
            vec3 samplePos = (texelFetch(u_position, offset, 0)).xyz;
            vec3 diff = samplePos - centerPos;
            float distSqr = diff.x * diff.x + diff.y * diff.y + diff.z * diff.z;
            float inside = 1.0 - step(BLUR_RADIUS_SQR, distSqr);
            float s = (inside * BLUR_KERNEL[k]) * texelFetch(u_edges, offset, 0).z; // SSAO is in Z channel
            samples += (1.0 - inside) * BLUR_KERNEL[k];
            blur += s;
        }
    }

    blur += samples * edges.b;

    fbEdgesBlurred = vec4(edges.r, edges.g, blur, 1.0);
    //fbEdgesBlurred = vec4(vec3(blur), 1.0);
}
