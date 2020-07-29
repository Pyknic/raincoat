#version 300 es
precision highp float;

in vec2 vTexCoord;

uniform sampler2D u_edges;

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

void main() {
    ivec2 at = ivec2(vTexCoord * vec2(320, 180));
    vec4 edges = texelFetch(u_edges, at, 0).xyzw;

    // Gaussian Blur (Can be optimized)
    float blur = 0.0;
    for (int i = -2; i <= 2; i++) { // Rows
        for (int j = -2; j <= 2; j++) { // Columns
            int k = (2 + i) * 5 + (j + 2);
            ivec2 offset = clamp(at + ivec2(j, i), ivec2(0, 0), ivec2(319, 179));
            float s = BLUR_KERNEL[k] * texelFetch(u_edges, offset, 0).z; // SSAO is in Z channel
            blur += s;
        }
    }

    fbEdgesBlurred = vec4(edges.r, edges.g, blur, 1.0);
    //fbEdgesBlurred = vec4(vec3(blur), 1.0);
}
