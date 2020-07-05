#version 330 core
out vec4 FragColor;
  
in vec2 TexCoord;

uniform sampler2D texture1;
uniform sampler2D texture2;

float near = 0.1; 
float far  = 100.0; 
  
float LinearizeDepth(float depth) 
{
    float z = depth * 2.0 - 1.0; // back to NDC 
    return (2.0 * near * far) / (far + near - z * (far - near));	
}

void main()
{
    //float depth = LinearizeDepth(gl_FragCoord.z) / far;
    //gl_FragDepth=depth;
    FragColor = vec4(1.0,0.1,0.1,1.0);//A value of 0.2 will return 20% of the first input color and 80% of the second input color
    //FragColor = mix(texture(texture1, TexCoord), texture(texture2, TexCoord), 0.2);//A value of 0.2 will return 20% of the first input color and 80% of the second input color
}