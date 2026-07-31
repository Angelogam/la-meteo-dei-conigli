import React, { useState } from "react";
import { DECOLLI } from "@/data/decolli";
import { weatherService } from "@/services/weatherService";
import { validaVentoPerDecollo, getVentoStatusColor } from "@/utils/validaVentoDecollo";