import React, { useMemo, useState } from 'react';
import { Cloud, Droplets, Wind } from 'lucide-react';

const JSON_DATA = [
  {
    "id": "monte-cavallaria",
    "nome": "Monte Cavallaria",
    "quota_decollo": 1430,
    "hours": ["15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00","00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00","00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00","00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00","00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00","00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00","00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00"],
    "profilo_verticale": [
      {"ora":"15:00","livelli":[{"alt":2,"temp":14.1,"wind":9.1,"dir":146},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.2,"wind":10.6,"dir":156},{"alt":1430,"temp":10.7,"wind":12.6,"dir":156}],"cloud":63,"precip":0},
      {"ora":"16:00","livelli":[{"alt":2,"temp":13.6,"wind":7.8,"dir":146},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12,"wind":8.7,"dir":156},{"alt":1430,"temp":10.5,"wind":10.7,"dir":156}],"cloud":67,"precip":0},
      {"ora":"17:00","livelli":[{"alt":2,"temp":12.9,"wind":5,"dir":159},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":11.9,"wind":6.2,"dir":170},{"alt":1430,"temp":10.4,"wind":8.2,"dir":170}],"cloud":70,"precip":0},
      {"ora":"18:00","livelli":[{"alt":2,"temp":12.2,"wind":2.5,"dir":225},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":11.9,"wind":2.3,"dir":231},{"alt":1430,"temp":10.4,"wind":4.3,"dir":231}],"cloud":60,"precip":0},
      {"ora":"19:00","livelli":[{"alt":2,"temp":11.9,"wind":3.3,"dir":311},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.4,"wind":2.2,"dir":351},{"alt":1430,"temp":10.9,"wind":4.2,"dir":351}],"cloud":31,"precip":0},
      {"ora":"20:00","livelli":[{"alt":2,"temp":11.8,"wind":4.4,"dir":305},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.3,"wind":4.6,"dir":342},{"alt":1430,"temp":10.8,"wind":6.6,"dir":342}],"cloud":0,"precip":0},
      {"ora":"21:00","livelli":[{"alt":2,"temp":11.8,"wind":4.9,"dir":306},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.4,"wind":5.4,"dir":340},{"alt":1430,"temp":10.9,"wind":7.4,"dir":340}],"cloud":0,"precip":0},
      {"ora":"22:00","livelli":[{"alt":2,"temp":11.7,"wind":5.5,"dir":302},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.5,"wind":5.5,"dir":337},{"alt":1430,"temp":11,"wind":7.5,"dir":337}],"cloud":2,"precip":0},
      {"ora":"23:00","livelli":[{"alt":2,"temp":11.6,"wind":5.8,"dir":300},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.4,"wind":5.5,"dir":328},{"alt":1430,"temp":10.9,"wind":7.5,"dir":328}],"cloud":1,"precip":0},
      {"ora":"00:00","livelli":[{"alt":2,"temp":11.6,"wind":6.5,"dir":304},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.4,"wind":6.8,"dir":335},{"alt":1430,"temp":10.9,"wind":8.8,"dir":335}],"cloud":0,"precip":0},
      {"ora":"01:00","livelli":[{"alt":2,"temp":11.6,"wind":6.5,"dir":304},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.5,"wind":6.6,"dir":331},{"alt":1430,"temp":11,"wind":8.6,"dir":331}],"cloud":0,"precip":0},
      {"ora":"02:00","livelli":[{"alt":2,"temp":11.5,"wind":6.2,"dir":306},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.4,"wind":6.4,"dir":333},{"alt":1430,"temp":10.9,"wind":8.4,"dir":333}],"cloud":0,"precip":0},
      {"ora":"03:00","livelli":[{"alt":2,"temp":11.4,"wind":6.7,"dir":306},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.4,"wind":6.9,"dir":332},{"alt":1430,"temp":10.9,"wind":8.9,"dir":332}],"cloud":56,"precip":0},
      {"ora":"04:00","livelli":[{"alt":2,"temp":11.3,"wind":6.9,"dir":309},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.4,"wind":7.1,"dir":330},{"alt":1430,"temp":10.9,"wind":9.1,"dir":330}],"cloud":0,"precip":0},
      {"ora":"05:00","livelli":[{"alt":2,"temp":11.2,"wind":7.1,"dir":311},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.4,"wind":7.9,"dir":330},{"alt":1430,"temp":10.9,"wind":9.9,"dir":330}],"cloud":5,"precip":0},
      {"ora":"06:00","livelli":[{"alt":2,"temp":11.4,"wind":6.4,"dir":308},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.5,"wind":6.8,"dir":328},{"alt":1430,"temp":11,"wind":8.8,"dir":328}],"cloud":2,"precip":0},
      {"ora":"07:00","livelli":[{"alt":2,"temp":12.5,"wind":4.3,"dir":318},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.6,"wind":4.8,"dir":333},{"alt":1430,"temp":11.1,"wind":6.8,"dir":333}],"cloud":5,"precip":0},
      {"ora":"08:00","livelli":[{"alt":2,"temp":14,"wind":2.2,"dir":360},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.8,"wind":2.2,"dir":360},{"alt":1430,"temp":11.3,"wind":4.2,"dir":360}],"cloud":8,"precip":0},
      {"ora":"09:00","livelli":[{"alt":2,"temp":15.2,"wind":2.3,"dir":72},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":13,"wind":1.4,"dir":90},{"alt":1430,"temp":11.5,"wind":3.4,"dir":90}],"cloud":11,"precip":0},
      {"ora":"10:00","livelli":[{"alt":2,"temp":15.8,"wind":3.2,"dir":117},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":13.2,"wind":3.4,"dir":148},{"alt":1430,"temp":11.7,"wind":5.4,"dir":148}],"cloud":38,"precip":0},
      {"ora":"11:00","livelli":[{"alt":2,"temp":16.1,"wind":5.2,"dir":146},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":13.5,"wind":6,"dir":163},{"alt":1430,"temp":12,"wind":8,"dir":163}],"cloud":66,"precip":0},
      {"ora":"12:00","livelli":[{"alt":2,"temp":16.2,"wind":6.8,"dir":155},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":13.7,"wind":8.1,"dir":167},{"alt":1430,"temp":12.2,"wind":10.1,"dir":167}],"cloud":93,"precip":0},
      {"ora":"13:00","livelli":[{"alt":2,"temp":16.4,"wind":7.4,"dir":157},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":13.9,"wind":9.1,"dir":171},{"alt":1430,"temp":12.4,"wind":11.1,"dir":171}],"cloud":92,"precip":0},
      {"ora":"14:00","livelli":[{"alt":2,"temp":16.4,"wind":7.3,"dir":160},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":14.1,"wind":9.1,"dir":173},{"alt":1430,"temp":12.6,"wind":11.1,"dir":173}],"cloud":92,"precip":0}
    ],
    "stabilita": [-0.6779661016949159,-0.42372881355932207,-1.2711864406779663,-1.3559322033898302,-1.610169491525424,-1.4406779661016944,-0.33898305084745795,0.8474576271186441,1.2711864406779663,1.4406779661016944,1.440677966101696,1.6949152542372883,1.7796610169491538,1.440677966101696,1.2711864406779663,1.52542372881356,0.9322033898305082,0.2542372881355923,0.5084745762711862,0.5084745762711862,0.33898305084745795,0.33898305084745795,0.42372881355932207,0.5084745762711862,0.42372881355932207,0.5084745762711862,0.33898305084745795,0.33898305084745795,0.5084745762711862,0.42372881355932207,0.5932203389830518,1.1016949152542364,1.101694915254238,1.2711864406779663,1.4406779661016944,1.610169491525424,1.186440677966102,0.9322033898305082,1.1016949152542364,1.1016949152542364,1.101694915254238,0.5932203389830518,-0.16949152542372822,-0.5084745762711862,-0.5084745762711876,-0.6779661016949143,-1.1016949152542364,-1.186440677966102,-0.8474576271186441,-0.42372881355932207,-0.16949152542372822,-0.08474576271186411,-0.16949152542372972,-0.42372881355932207,-0.42372881355932207,0.33898305084745645,1.6101694915254225,1.9491525423728822,2.2033898305084745,2.1186440677966103,2.2033898305084745,2.033898305084746,1.8644067796610164,1.610169491525424,1.3559322033898302,0.8474576271186441,0.2542372881355923,-0.42372881355932207,-0.42372881355932207,-0.5084745762711862,-0.6779661016949159,-0.6779661016949159,-0.6779661016949159,-0.76271186440678,-0.76271186440678,-0.8474576271186441,-0.9322033898305082,-1.016949152542374,-0.9322033898305082,-0.08474576271186411,1.0169491525423724,1.8644067796610164,2.203389830508476,2.203389830508476,2.1186440677966103,2.1186440677966103,2.1186440677966103,1.6949152542372883,0.9322033898305068,0,-0.7627118644067785,-1.2711864406779663,-1.6101694915254225,-1.8644067796610195,-1.9491525423728822,-1.949152542372879,-1.8644067796610164,-1.8644067796610164,-1.8644067796610195,-1.779661016949151,-1.779661016949151,-1.864406779661018,-1.6101694915254225,-0.7627118644067785,0.33898305084745645,1.1864406779661036,1.6949152542372883,2.033898305084745,2.2033898305084727,2.1186440677966103,1.9491525423728822,1.52542372881356,0.7627118644067785,-0.2542372881355938,-1.0169491525423753,-1.52542372881356,-1.779661016949151,-1.8644067796610195,-1.6949152542372883,-1.3559322033898302,-1.2711864406779676,-1.3559322033898302,-1.52542372881356,-1.610169491525424,-1.440677966101696,-1.101694915254238,-0.6779661016949143,0.16949152542372822,1.1016949152542364,1.7796610169491522,1.9491525423728806,1.8644067796610164,1.6949152542372883,1.610169491525424,1.610169491525424,1.610169491525424,1.52542372881356,1.2711864406779663,0.8474576271186441,0.5932203389830518,0.5084745762711862,0.5932203389830503,0.5932203389830503,0.6779661016949159,0.76271186440678,0.76271186440678,0.6779661016949159,0.508474576271187,0.33898305084745795,0.2542372881355931,0.16949152542372897,0.42372881355932207,0.9322033898305082,1.610169491525424,2.1186440677966103,2.203389830508475,2.28813559322034,2.1186440677966103,2.1186440677966103,1.9491525423728822,1.6949152542372883,1.186440677966102,0.5084745762711862,0,-0.42372881355932207,-0.6779661016949151,-0.8474576271186441,-1.0169491525423724,-1.1016949152542372],
    "cloud_base": 2300,
    "zero_iso": 3100,
    "icone": {"parapendio": true,"nuvole": true,"pioggia": true}
  },
  {
    "id": "andrate",
    "nome": "Andrate",
    "quota_decollo": 1000,
    "hours": ["00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00","00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00","00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00","00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00","00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00"],
    "profilo_verticale": [
      {"ora":"00:00","livelli":[{"alt":2,"temp":14.3,"wind":11.2,"dir":303},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":15.1,"wind":16.6,"dir":297},{"alt":1000,"temp":13.6,"wind":18.6,"dir":297}],"cloud":37,"precip":0},
      {"ora":"01:00","livelli":[{"alt":2,"temp":13.6,"wind":10.2,"dir":315},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":14.4,"wind":14.2,"dir":300},{"alt":1000,"temp":12.9,"wind":16.2,"dir":300}],"cloud":0,"precip":0},
      {"ora":"02:00","livelli":[{"alt":2,"temp":13.4,"wind":9.2,"dir":321},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":14.3,"wind":13.9,"dir":307},{"alt":1000,"temp":12.8,"wind":15.9,"dir":307}],"cloud":0,"precip":0},
      {"ora":"03:00","livelli":[{"alt":2,"temp":13.4,"wind":12.5,"dir":314},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":14.4,"wind":18.8,"dir":306},{"alt":1000,"temp":12.9,"wind":20.8,"dir":306}],"cloud":1,"precip":0},
      {"ora":"04:00","livelli":[{"alt":2,"temp":13.3,"wind":14.3,"dir":313},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":14.3,"wind":21.9,"dir":311},{"alt":1000,"temp":12.8,"wind":23.9,"dir":311}],"cloud":0,"precip":0},
      {"ora":"05:00","livelli":[{"alt":2,"temp":13.1,"wind":14.1,"dir":322},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":14,"wind":21.4,"dir":316},{"alt":1000,"temp":12.5,"wind":23.4,"dir":316}],"cloud":0,"precip":0},
      {"ora":"06:00","livelli":[{"alt":2,"temp":13.5,"wind":7.4,"dir":321},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":13.3,"wind":10.5,"dir":308},{"alt":1000,"temp":11.8,"wind":12.5,"dir":308}],"cloud":0,"precip":0},
      {"ora":"07:00","livelli":[{"alt":2,"temp":13.4,"wind":4.2,"dir":301},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.8,"wind":6.4,"dir":313},{"alt":1000,"temp":11.3,"wind":8.4,"dir":313}],"cloud":0,"precip":0},
      {"ora":"08:00","livelli":[{"alt":2,"temp":13.7,"wind":1.8,"dir":169},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.4,"wind":1.8,"dir":169},{"alt":1000,"temp":10.9,"wind":3.8,"dir":169}],"cloud":0,"precip":0},
      {"ora":"09:00","livelli":[{"alt":2,"temp":14.1,"wind":3.4,"dir":162},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.2,"wind":3.1,"dir":159},{"alt":1000,"temp":10.7,"wind":5.1,"dir":159}],"cloud":85,"precip":0},
      {"ora":"10:00","livelli":[{"alt":2,"temp":14.2,"wind":8.4,"dir":140},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.2,"wind":8.4,"dir":137},{"alt":1000,"temp":10.7,"wind":10.4,"dir":137}],"cloud":78,"precip":0},
      {"ora":"11:00","livelli":[{"alt":2,"temp":14.4,"wind":12.4,"dir":144},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.4,"wind":12.7,"dir":137},{"alt":1000,"temp":10.9,"wind":14.7,"dir":137}],"cloud":91,"precip":0},
      {"ora":"12:00","livelli":[{"alt":2,"temp":14.5,"wind":11.2,"dir":140},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.4,"wind":11.7,"dir":133},{"alt":1000,"temp":10.9,"wind":13.7,"dir":133}],"cloud":87,"precip":0},
      {"ora":"13:00","livelli":[{"alt":2,"temp":14.5,"wind":10.1,"dir":145},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":12.7,"wind":10.2,"dir":138},{"alt":1000,"temp":11.2,"wind":12.2,"dir":138}],"cloud":91,"precip":0},
      {"ora":"14:00","livelli":[{"alt":2,"temp":14.9,"wind":10.7,"dir":132},{"alt":50,"temp":null,"wind":null,"dir":null},{"alt":120,"temp":13.1,"wind":11.3,"dir":127},{"alt":1000,"temp":11.6,"wind":13.3,"dir":127}],"cloud":100,"precip":0}
    ],
    "stabilita": [-0.6779661016949143,-0.6779661016949159,-0.76271186440678,-0.8474576271186441,-0.8474576271186441,-0.76271186440678,0.16949152542372822,0.5084745762711862,1.1016949152542364,1.610169491525424,1.6949152542372883,1.6949152542372883,1.7796610169491522,1.52542372881356,1.52542372881356,1.186440677966102,1.1016949152542364,0.6779661016949159,0.42372881355932207,0.16949152542372822,0.2542372881355938,0.08474576271186411,0.42372881355932207,0.42372881355932207,0.33898305084745795,-0.16949152542372822,0.2542372881355938,0.5084745762711862,0.2542372881355938,-0.08474576271186561,0.16949152542372972,0.9322033898305082,0.7627118644067785,0.8474576271186441,1.6949152542372883,1.186440677966102,1.7796610169491522,1.440677966101696,1.3559322033898302,1.0169491525423724,1.016949152542374,0.8474576271186441,-0.33898305084745795,-0.42372881355932207,-0.5084745762711862,-0.9322033898305082,-1.3559322033898302,-1.4406779661016944,-1.186440677966102,-1.1864406779661005,-0.9322033898305082,-0.7627118644067785,-0.6779661016949159,-0.8474576271186441,-0.6779661016949159,0.42372881355932207,1.52542372881356,1.9491525423728822,2.203389830508476,2.1186440677966103,1.9491525423728822,1.9491525423728822,1.864406779661018,1.610169491525424,1.3559322033898302,0.8474576271186441,-0.08474576271186411,-0.6779661016949159,-1.0169491525423724,-1.0169491525423724,-1.101694915254238,-1.101694915254238,-1.016949152542374,-1.101694915254238,-1.0169491525423724,-1.101694915254238,-1.186440677966102,-1.101694915254238,-1.0169491525423724,-0.16949152542372822,1.016949152542374,1.8644067796610164,2.2033898305084745,2.1186440677966103,2.033898305084745,2.033898305084745,2.033898305084745,1.6949152542372883,0.9322033898305068,0,-0.7627118644067785,-1.2711864406779663,-1.6101694915254225,-1.8644067796610195,-1.9491525423728822,-1.949152542372879,-1.8644067796610164,-1.8644067796610164,-1.8644067796610195,-1.779661016949151,-1.779661016949151,-1.864406779661018,-1.6101694915254225,-0.7627118644067785,0.33898305084745645,1.1864406779661036,1.6949152542372883,2.033898305084745,2.2033898305084727,2.1186440677966103,1.9491525423728822,1.52542372881356,0.7627118644067785,-0.2542372881355938,-1.0169491525423753,-1.52542372881356,-1.779661016949151,-1.8644067796610195,-1.6949152542372883,-1.3559322033898302,-1.2711864406779676,-1.3559322033898302,-1.52542372881356,-1.610169491525424,-1.440677966101696,-1.101694915254238,-0.6779661016949143,0.16949152542372822,1.1016949152542364,1.7796610169491522,1.9491525423728806,1.8644067796610164,1.6949152542372883,1.610169491525424,1.610169491525424,1.610169491525424,1.52542372881356,1.2711864406779663,0.8474576271186441,0.5932203389830518,0.5084745762711862,0.5932203389830503,0.5932203389830503,0.76271186440678,0.9322033898305082,1.1016949152542364,1.101694915254238,0.9322033898305098,0.8474576271186441,0.8474576271186441,0.76271186440678,0.8474576271186441,1.2711864406779663,1.7796610169491522,2.2033898305084745,2.372881355932204,2.372881355932204,2.2881355932203387,2.203389830508476,2.033898305084746,1.7796610169491522,1.1864406779661005,0.5084745762711862,0,-0.33898305084745795,-0.5932203389830503,-0.76271186440678,-1.016949152542374,-1.186440677966102],
    "cloud_base": 2300,
    "zero_iso": 3100,
    "icone": {"parapendio": true,"nuvole": true,"pioggia": true}
  }
];

interface SiteData {
  id: string;
  nome: string;
  quota_decollo: number;
  profilo_verticale: Array<{
    ora: string;
    livelli: Array<{ alt: number; temp: number | null; wind: number | null; dir: number | null }>;
    cloud: number;
    precip: number;
  }>;
  stabilita: number[];
  cloud_base: number;
  zero_iso: number;
}

interface LevelData {
  alt: number;
  temp: number | null;
  wind: number | null;
  dir: number | null;
}

function getStabilityColor(stability: number): string {
  if (stability <= -1.0) return '#1e3a8a';
  if (stability <= -0.5) return '#3b82f6';
  if (stability <= 0) return '#60a5fa';
  if (stability <= 0.5) return '#86efac';
  if (stability <= 1.0) return '#fde047';
  if (stability <= 1.5) return '#fb923c';
  if (stability <= 2.0) return '#ef4444';
  return '#b91c1c';
}

function getWindBarbPath(x: number, y: number, speedKmh: number, dirDeg: number): string {
  if (speedKmh === 0 || speedKmh == null) return '';
  const knots = speedKmh * 0.539957;
  const angle = ((dirDeg - 90) * Math.PI) / 180;
  const staffLen = 35;
  const endX = x + staffLen * Math.cos(angle);
  const endY = y + staffLen * Math.sin(angle);
  let path = `M${x},${y} L${endX},${endY}`;
  const rem = Math.round(knots / 5) * 5;
  let pos = 1.0;
  let remaining = rem;
  while (remaining >= 50 && pos >= 0.25) {
    const bx = x + pos * (endX - x);
    const by = y + pos * (endY - y);
    const featherAngle = angle + Math.PI * 0.6;
    const fx = bx + 14 * Math.cos(featherAngle);
    const fy = by + 14 * Math.sin(featherAngle);
    const fx2 = bx + 7 * Math.cos(angle);
    const fy2 = by + 7 * Math.sin(angle);
    path += ` M${bx},${by} L${fx},${fy} L${fx2},${fy2} Z`;
    remaining -= 50;
    pos -= 0.22;
  }
  while (remaining >= 10 && pos >= 0.2) {
    const bx = x + pos * (endX - x);
    const by = y + pos * (endY - y);
    const featherAngle = angle + Math.PI * 0.6;
    const fx = bx + 10 * Math.cos(featherAngle);
    const fy = by + 10 * Math.sin(featherAngle);
    path += ` M${bx},${by} L${fx},${fy}`;
    remaining -= 10;
    pos -= 0.16;
  }
  if (remaining >= 5 && pos >= 0.2) {
    const bx = x + pos * (endX - x);
    const by = y + pos * (endY - y);
    const featherAngle = angle + Math.PI * 0.6;
    const fx = bx + 6 * Math.cos(featherAngle);
    const fy = by + 6 * Math.sin(featherAngle);
    path += ` M${bx},${by} L${fx},${fy}`;
  }
  return path;
}

function getLevelAtAlt(livelli: LevelData[], alt: number): LevelData | null {
  const exact = livelli.find(l => l.alt === alt);
  if (exact) return exact;
  const valid = livelli.filter(l => l.temp !== null);
  if (valid.length < 2) return null;
  valid.sort((a, b) => a.alt - b.alt);
  for (let i = 0; i < valid.length - 1; i++) {
    if (alt >= valid[i].alt && alt <= valid[i + 1].alt) {
      const t = (alt - valid[i].alt) / (valid[i + 1].alt - valid[i].alt);
      return {
        alt,
        temp: valid[i].temp! + (valid[i + 1].temp! - valid[i].temp!) * t,
        wind: valid[i].wind !== null && valid[i + 1].wind !== null
          ? valid[i].wind! + (valid[i + 1].wind! - valid[i].wind!) * t
          : null,
        dir: valid[i].dir !== null && valid[i + 1].dir !== null
          ? valid[i].dir! + (valid[i + 1].dir! - valid[i].dir!) * t
          : null
      };
    }
  }
  return null;
}

export default function AlpiumVerticalChart() {
  const [selectedSiteId, setSelectedSiteId] = useState<string>('monte-cavallaria');
  const [selectedHour, setSelectedHour] = useState<number>(0);

  const siteData = useMemo(() => JSON_DATA.find(s => s.id === selectedSiteId) as SiteData, [selectedSiteId]);

  if (!siteData) return <div>Caricamento...</div>;

  const { quota_decollo, profilo_verticale, stabilita, cloud_base, zero_iso, nome } = siteData;
  const currentHour = profilo_verticale[selectedHour];
  const currentStability = stabilita[selectedHour] ?? 0;

  const displayLevels = [2, 50, 120, quota_decollo];
  const maxAlt = Math.max(cloud_base, zero_iso, quota_decollo + 1000);
  const minAlt = quota_decollo;
  const altRange = maxAlt - minAlt;

  const yScale = (alt: number) => {
    return 80 + 520 - ((alt - minAlt) / altRange) * 520;
  };

  const levelData = displayLevels.map(alt => {
    const level = getLevelAtAlt(currentHour.livelli, alt);
    const isTakeoff = alt === quota_decollo;
    return { alt, ...level, isTakeoff } as LevelData & { alt: number; isTakeoff: boolean };
  }).filter(d => d !== null);

  const showClouds = currentHour.cloud > 10;
  const showRain = currentHour.precip > 0;
  const showFog = currentHour.cloud > 80;

  return (
    <div className="bg-slate-50 min-h-screen p-4 font-mono">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{nome} — Profilo Verticale Alpium</h1>
            <p className="text-slate-500 text-xs mt-1">Decollo {quota_decollo}m · Cumuli {cloud_base}m · Zero {zero_iso}m</p>
          </div>
          <div className="flex gap-2">
            <select value={selectedSiteId} onChange={e => { setSelectedSiteId(e.target.value); setSelectedHour(0); }}
              className="px-2 py-1 text-sm border rounded bg-white">
              {JSON_DATA.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.quota_decollo}m)</option>)}
            </select>
            <select value={selectedHour} onChange={e => setSelectedHour(Number(e.target.value))}
              className="px-2 py-1 text-sm border rounded bg-white min-w-[160px]">
              {profilo_verticale.slice(0, 24).map((h, i) => (
                <option key={i} value={i}>{h.ora} · {h.cloud}% · ΔT={stabilita[i]?.toFixed(2)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
          <svg width="100%" viewBox="0 0 900 700" className="block">
            <defs>
              <linearGradient id="stabGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#b91c1c" />
                <stop offset="25%" stopColor="#ef4444" />
                <stop offset="40%" stopColor="#fb923c" />
                <stop offset="55%" stopColor="#fde047" />
                <stop offset="70%" stopColor="#86efac" />
                <stop offset="85%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
            </defs>

            {/* Grid */}
            {[minAlt, ...Array.from({length: Math.ceil(altRange/200)}, (_,i) => minAlt + (i+1)*200)].filter(a => a <= maxAlt).map(alt => (
              <g key={alt}>
                <line x1={60} y1={yScale(alt)} x2={840} y2={yScale(alt)} stroke="#e2e8f0" strokeWidth={alt === minAlt ? 1.5 : 0.5} strokeDasharray={alt === minAlt ? '0' : '2,4'} />
                <text x={55} y={yScale(alt) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{alt}m</text>
              </g>
            ))}

            {/* Time axis */}
            {profilo_verticale.slice(0, 24).map((h, i) => {
              const x = 60 + (i / 23) * 780;
              return (
                <g key={i}>
                  <line x1={x} y1={80} x2={x} y2={600} stroke="#f1f5f9" strokeWidth={1} />
                  <text x={x} y={620} textAnchor="middle" fontSize="9" fill="#94a3b8">{h.ora}</text>
                </g>
              );
            })}

            {/* Stability column background gradient */}
            <rect x={790} y={80} width={50} height={520} fill="url(#stabGrad)" opacity={0.85} />

            {/* Stability labels */}
            <text x={815} y={75} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="bold">ΔT/100m</text>
            <text x={815} y={595} textAnchor="middle" fontSize="8" fill="#ef4444">Inst</text>
            <text x={815} y={88} textAnchor="middle" fontSize="8" fill="#3b82f6">Stab</text>

            {/* Zero termico - linea rossa */}
            {zero_iso > minAlt && zero_iso < maxAlt && (
              <g>
                <line x1={60} y1={yScale(zero_iso)} x2={780} y2={yScale(zero_iso)} stroke="#ef4444" strokeWidth={2} strokeDasharray="6,3" />
                <text x={770} y={yScale(zero_iso) - 6} fontSize="10" fill="#ef4444" fontWeight="bold" textAnchor="end">0°C · {zero_iso}m</text>
                {Array.from({length: 6}, (_, i) => (
                  <text key={i} x={80 + i * 130} y={yScale(zero_iso) + 14} fontSize="9" fill="#ef4444" textAnchor="middle">❄</text>
                ))}
              </g>
            )}

            {/* Base cumulo - linea bianca */}
            {cloud_base > minAlt && cloud_base < maxAlt && (
              <g>
                <line x1={60} y1={yScale(cloud_base)} x2={780} y2={yScale(cloud_base)} stroke="#fff" strokeWidth={3} filter="drop-shadow(0 0 2px #000)" />
                <line x1={60} y1={yScale(cloud_base)} x2={780} y2={yScale(cloud_base)} stroke="#94a3b8" strokeWidth={1} strokeDasharray="6,3" />
                <text x={70} y={yScale(cloud_base) - 8} fontSize="10" fill="#64748b" fontWeight="bold">Base cumulo · {cloud_base}m</text>
                {Array.from({length: 8}, (_, i) => (
                  <g key={i} transform={`translate(${100 + i * 90}, ${yScale(cloud_base) - 4})`}>
                    <ellipse cx={0} cy={0} rx={10} ry={5} fill="#fff" stroke="#cbd5e1" strokeWidth={0.5} />
                    <ellipse cx={8} cy={-3} rx={6} ry={3} fill="#fff" stroke="#cbd5e1" strokeWidth={0.5} />
                    <ellipse cx={-8} cy={-3} rx={6} ry={3} fill="#fff" stroke="#cbd5e1" strokeWidth={0.5} />
                  </g>
                ))}
              </g>
            )}

            {/* Temperature profile lines (all 24h) */}
            <g strokeWidth={1} fill="none" opacity={0.25}>
              {profilo_verticale.slice(0, 24).map((hd, hi) => {
                const pts = hd.livelli.filter(l => l.temp !== null).sort((a,b) => a.alt - b.alt).map(l => `${60 + (hi/23)*780},${yScale(l.alt)}`).join(' ');
                return pts ? <polyline key={hi} points={pts} stroke="#64748b" /> : null;
              })}
            </g>

            {/* Current hour temperature profile (thick) */}
            {(() => {
              const pts = currentHour.livelli.filter(l => l.temp !== null).sort((a,b) => a.alt - b.alt).map(l => `${60},${yScale(l.alt)}`).join(' ');
              return pts ? <polyline points={pts} stroke="#1e293b" strokeWidth={2.5} fill="none" /> : null;
            })()}

            {/* Level markers and data */}
            {levelData.map((level) => {
              const y = yScale(level.alt);
              return (
                <g key={level.alt}>
                  <line x1={60} y1={y} x2={780} y2={y} stroke="#e2e8f0" strokeWidth={0.5} strokeDasharray="2,3" />
                  <text x={55} y={y + 4} textAnchor="end" fontSize="11" fill={level.isTakeoff ? '#7c3aed' : '#334155'} fontWeight={level.isTakeoff ? 'bold' : 'normal'}>{level.alt}m</text>
                  <text x={790} y={y - 10} fontSize="11" fill="#1e293b" fontWeight="bold">{level.temp !== null ? level.temp.toFixed(1) + '°' : '—'}</text>
                  {level.wind !== null && level.wind > 0.5 && level.dir !== null && (
                    <g transform={`translate(${730}, ${y})`}>
                      <path d={getWindBarbPath(0, 0, level.wind!, level.dir!)} stroke="#1e293b" strokeWidth={1.5} fill="#1e293b" />
                      <text x={-55} y={-12} fontSize="8" fill="#64748b" textAnchor="end">{level.wind.toFixed(0)}km/{level.dir}°</text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Paragliding icon at takeoff altitude */}
            {(() => {
              const tl = levelData.find(l => l.isTakeoff);
              if (!tl) return null;
              const y = yScale(tl.alt);
              return (
                <g transform={`translate(450, ${y - 55})`}>
                  <ellipse cx={0} cy={40} rx={20} ry={6} fill="#000" opacity={0.08} />
                  <path d="M0,10 Q-30,-20 0,-45 Q30,-20 0,10 Z" fill="#7c3aed" stroke="#5b21b6" strokeWidth={2} />
                  <path d="M-18,5 L0,18 M18,5 L0,18" stroke="#5b21b6" strokeWidth={1.5} />
                  <circle cx={0} cy={8} r={5} fill="#fff" stroke="#5b21b6" strokeWidth={2} />
                  <text x={0} y={-55} textAnchor="middle" fontSize="12" fill="#7c3aed" fontWeight="bold">DECOLLO</text>
                </g>
              );
            })()}

            {/* Weather icons above paraglider */}
            {(() => {
              const tl = levelData.find(l => l.isTakeoff);
              if (!tl) return null;
              const y = yScale(tl.alt);
              return (
                <g transform={`translate(450, ${y - 110})`}>
                  {showClouds && (
                    <g>
                      {Array.from({length: Math.max(1, Math.round(currentHour.cloud / 25))}, (_, i) => (
                        <g key={i} transform={`translate(${(i - 1) * 40}, 0)`}>
                          <ellipse cx={0} cy={0} rx={14} ry={7} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
                          <ellipse cx={12} cy={-5} rx={9} ry={4} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
                          <ellipse cx={-12} cy={-5} rx={9} ry={4} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
                        </g>
                      ))}
                      {showFog && (
                        <>
                          <line x1={-25} y1={-12} x2={25} y2={-12} stroke="#94a3b8" strokeWidth={1.5} opacity={0.6} />
                          <line x1={-20} y1={-8} x2={20} y2={-8} stroke="#94a3b8" strokeWidth={1.5} opacity={0.6} />
                          <line x1={-15} y1={-4} x2={15} y2={-4} stroke="#94a3b8" strokeWidth={1.5} opacity={0.6} />
                        </>
                      )}
                    </g>
                  )}
                  {showRain && (
                    <g transform="translate(0, 12)">
                      <Droplets size={20} color="#3b82f6" />
                    </g>
                  )}
                  <text x={0} y={28} textAnchor="middle" fontSize="9" fill="#64748b">{currentHour.cloud}% nuvole</text>
                </g>
              );
            })()}

            {/* Info box */}
            <g transform="translate(60, 80)">
              <rect x={0} y={0} width={260} height={95} rx={6} fill="#fff" stroke="#e2e8f0" strokeWidth={1} />
              <text x={10} y={20} fontSize="11" fill="#1e293b" fontWeight="bold">{currentHour.ora} — {quota_decollo}m</text>
              <text x={10} y={40} fontSize="10" fill="#475569">Temp: {(currentHour.livelli.find(l => l.alt === quota_decollo)?.temp ?? '—').toFixed(1)}°C</text>
              <text x={10} y={56} fontSize="10" fill="#475569">Vento: {(currentHour.livelli.find(l => l.alt === quota_decollo)?.wind ?? '—').toFixed(1)} km/h da {(currentHour.livelli.find(l => l.alt === quota_decollo)?.dir ?? '—')}°</text>
              <text x={10} y={72} fontSize="10" fill={currentStability > 0.5 ? '#ef4444' : currentStability < -0.5 ? '#3b82f6' : '#f59e0b'} fontWeight="bold">
                Stabilità: {currentStability > 0.5 ? 'INSTABILE' : currentStability < -0.5 ? 'STABILE' : 'NEUTRO'} ({currentStability.toFixed(2)}°C/100m)
              </text>
              <text x={10} y={88} fontSize="10" fill="#94a3b8">Nuvole: {currentHour.cloud}% {currentHour.precip > 0 ? '| Pioggia: ' + currentHour.precip + 'mm' : ''}</text>
            </g>

            {/* Axes */}
            <line x1={60} y1={80} x2={60} y2={600} stroke="#334155" strokeWidth={1.5} />
            <line x1={60} y1={600} x2={840} y2={600} stroke="#334155" strokeWidth={1.5} />
            <text x={30} y={340} textAnchor="middle" transform="rotate(-90,30,340)" fontSize="11" fill="#334155" fontWeight="bold">Quota (m)</text>
            <text x={450} y={645} textAnchor="middle" fontSize="11" fill="#334155" fontWeight="bold">Tempo (ore)</text>
          </svg>
        </div>

        {/* Detail cards */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {levelData.map(l => (
            <div key={l.alt} className="bg-white rounded-lg border border-slate-200 p-3">
              <h4 className="font-bold text-sm text-slate-800 mb-1">{l.isTakeoff ? '🚁 ' : '📍 '}{l.alt}m {l.isTakeoff && '(DECOLLO)'}</h4>
              <div className="text-xs space-y-0.5">
                <div className="flex justify-between"><span className="text-slate-400">Temp</span><span className="font-mono font-bold">{l.temp?.toFixed(1) ?? '—'}°C</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Vento</span><span className="font-mono font-bold">{l.wind?.toFixed(1) ?? '—'} km/h</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Dir</span><span className="font-mono font-bold">{l.dir ?? '—'}°</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}