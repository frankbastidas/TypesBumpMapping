#version 330 core
out vec4 FragColor;

in VS_OUT {
    vec3 FragPos;
    vec2 TexCoords;
    vec3 TangentLightPos;
    vec3 TangentViewPos;
    vec3 TangentFragPos;
} fs_in;

uniform sampler2D diffuseMap;
uniform sampler2D normalMap;
uniform sampler2D depthMap;

uniform float heightScale;


vec4 mappingLightingSh(vec2 texCoords, vec3 lightDir,vec3 viewDir, float factLight){
// obtain normal from normal map
    vec3 normal = texture(normalMap, texCoords).rgb;
    normal = normalize(normal * 2.0 - 1.0);   
   
    // get diffuse color
    vec3 color = texture(diffuseMap, texCoords).rgb;

    float ambientF = 0.1;
    // ambient
    //vec3 ambient = 0.1 * color;
    // diffuse
    
    float diff = clamp(dot(normal, lightDir), 0, 1);
    //vec3 diffuse = diff * color;
    // specular    
    vec3 reflectDir = reflect(-lightDir, normal);
    vec3 halfwayDir = normalize(lightDir + viewDir);  
    float spec = pow(max(dot(reflectDir, halfwayDir), 0.0), 32.0);
    vec3 specular = vec3(0.2) * spec;

    vec4 resColor;
    resColor.rgb = color * (ambientF + (diff + spec) * pow(factLight, 4));
    resColor.a=1.0;
    return resColor;
}

float parallaxSoftShadowMultiplier(vec3 lightDir, vec2 texCoords, float initialHeight){
    
   float shadowMultiplier = 1;

   const float minLayers = 15;
   const float maxLayers = 30;

           // calculate lighting only for surface oriented to the light source
   if(dot(vec3(0, 0, 1), lightDir) > 0)
   {
      // calculate initial parameters
      float numSamplesUnderSurface = 0;
      shadowMultiplier = 0;
      float numLayers = mix(maxLayers, minLayers, abs(dot(vec3(0, 0, 1), lightDir)));
      float layerHeight = initialHeight / numLayers;
      vec2 texStep = heightScale * lightDir.xy / lightDir.z / numLayers;

      // current parameters
      float currentLayerHeight = initialHeight - layerHeight;
      vec2 currentTextureCoords = texCoords + texStep;
      float heightFromTexture = texture(depthMap, currentTextureCoords).r;
      int stepIndex = 1;

      // while point is below depth 0.0 )
      while(currentLayerHeight > 0)
      {
         // if point is under the surface
         if(heightFromTexture < currentLayerHeight)
         {
            // calculate partial shadowing factor
            numSamplesUnderSurface += 1;
            float newShadowMultiplier = (currentLayerHeight - heightFromTexture) *
                                             (1.0 - stepIndex / numLayers);
            shadowMultiplier = max(shadowMultiplier, newShadowMultiplier);
         }

         // offset to the next layer
         stepIndex += 1;
         currentLayerHeight -= layerHeight;
         currentTextureCoords += texStep;
         heightFromTexture = texture(depthMap, currentTextureCoords).r;
      }

      // Shadowing factor should be 1 if there were no points under the surface
      if(numSamplesUnderSurface < 1)
      {
         shadowMultiplier = 1;
      }
      else
      {
         shadowMultiplier = 1.0 - shadowMultiplier;
      }
   }
   return shadowMultiplier;
}

vec2 ReliefMapping(vec2 texCoords, vec3 viewDir, out float parallaxHeight )
{ 
    // number of depth layers
    const float minLayers = 8;
    const float maxLayers = 32;
    float numLayers = mix(maxLayers, minLayers, abs(dot(vec3(0.0, 0.0, 1.0), viewDir)));  
    // calculate the size of each layer
    float layerDepth = 1.0 / numLayers;
    // depth of current layer
    float currentLayerDepth = 0.0;
    // the amount to shift the texture coordinates per layer (from vector P)
    vec2 P = viewDir.xy / viewDir.z * heightScale; 
    vec2 deltaTexCoords = P / numLayers;
  
    // get initial values
    vec2  currentTexCoords     = texCoords;
    float currentDepthMapValue = texture(depthMap, currentTexCoords).r;
      
    while(currentLayerDepth < currentDepthMapValue)
    {
        // shift texture coordinates along direction of P
        currentTexCoords -= deltaTexCoords;
        // get depthmap value at current texture coordinates
        currentDepthMapValue = texture(depthMap, currentTexCoords).r;  
        // get depth of next layer
        currentLayerDepth += layerDepth;  
    }
       ///////////////////////////////////////////////////////////
   // Start of Relief Parallax Mapping

   // decrease shift and height of layer by half
   vec2 deltaTexCoord = deltaTexCoords / 2;
   float deltaHeight = layerDepth / 2;

   // return to the mid point of previous layer
   currentTexCoords += deltaTexCoord;
   currentLayerDepth -= deltaHeight;

   // binary search to increase precision of Steep Paralax Mapping
   const int numSearches = 5;
   for(int i=0; i<numSearches; i++)
   {
      // decrease shift and height of layer by half
      deltaTexCoord /= 2;
      deltaHeight /= 2;

      // new depth from heightmap
      currentDepthMapValue = texture(depthMap, currentTexCoords).r;

      // shift along or agains vector V
      if(currentLayerDepth < currentDepthMapValue) // below the surface
      {
         currentTexCoords -= deltaTexCoord;
         currentLayerDepth += deltaHeight;
      }
      else // above the surface
      {
         currentTexCoords += deltaTexCoord;
         currentLayerDepth -= deltaHeight;
      }
   }

   // return results
   parallaxHeight = currentLayerDepth;    
   return currentTexCoords;
}


void main()
{           
    // offset texture coordinates with Parallax Mapping
    vec3 viewDir = normalize(fs_in.TangentViewPos - fs_in.TangentFragPos);
    
    float parallaxHeight;
    vec2 texCoords = ReliefMapping(fs_in.TexCoords,  viewDir, parallaxHeight);       
    if(texCoords.x > 1.0 || texCoords.y > 1.0 || texCoords.x < 0.0 || texCoords.y < 0.0)
        discard;

    vec3 lightDir = normalize(fs_in.TangentLightPos - fs_in.TangentFragPos);
    // get self-shadowing factor for elements of parallax
    float shadowMultiplier = parallaxSoftShadowMultiplier(lightDir, texCoords, parallaxHeight - 0.05);
    FragColor = mappingLightingSh(texCoords, lightDir, viewDir, shadowMultiplier);
}