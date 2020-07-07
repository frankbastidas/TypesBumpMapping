#version 330 core
layout (location = 0) in vec3 aPos;
layout (location = 1) in vec3 aNormal;
layout (location = 2) in vec2 aTexCoords;
layout (location = 3) in vec3 aTangent;
layout (location = 4) in vec3 aBitangent;

out VS_OUT {
    vec3 eye_to_pos;   //eye_to_pos 
    vec2 TexCoords;
    vec3 to_light;   //to_light
    vec3 to_eye;    //to_eye
    vec3 position_tan;    //position_tan
} vs_out;

uniform mat4 projection;
uniform mat4 view;
uniform mat4 model;

uniform vec3 lightPos;  //light_pos
uniform vec3 viewPos;   //eye_pos

void main()
{
    /*vs_out.TexCoords = aTexCoords;           

    mat3 TBN = mat3(aTangent,aBitangent,aNormal);

    vs_out.to_light = (lightPos - aPos) * TBN ;
    vs_out.to_eye  = (viewPos - aPos) * TBN ;
    vs_out.position_tan = aPos * TBN;
    
    vs_out.eye_to_pos = vec3(view * model * vec4(aPos, 1.0));   */
    //---------------------------------

    vs_out.eye_to_pos = vec3(view * model * vec4(aPos, 1.0));   
    vs_out.TexCoords = aTexCoords; 

    vec3 T = normalize(mat3(model) * aTangent);
    vec3 B = normalize(mat3(model) * aBitangent);
    vec3 N = normalize(mat3(model) * aNormal);
    mat3 TBN = transpose(mat3(T, B, N));

    vs_out.to_light = TBN * lightPos;
    vs_out.to_eye  = TBN * viewPos;
    vs_out.position_tan  = TBN * vs_out.eye_to_pos;

    gl_Position = projection * view * model * vec4(aPos, 1.0);
}