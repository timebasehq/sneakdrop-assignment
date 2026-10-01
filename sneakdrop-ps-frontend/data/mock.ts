export interface Variant {
  id: string;
  image: string;
  thumbnail: string;
}

export interface Product {
  id: string;
  brand: string;
  title: string;
  price: number;
  originalPrice?: number;
  images: string[];
  variants: Variant[];
  sizes: number[];
  composition: { name: string; value: number }[];
  description: string;
  statusColor: string;
}

export const products: Product[] = [
  {
    id: "p1",
    brand: "Balenciaga",
    title: "High Speed Sneakers",
    price: 65000,
    images: [
      "/balenciaga_speed_sneaker_1790697391065.png",
      "/balenciaga_speed_sneaker_1790697391065.png",
      "/balenciaga_speed_sneaker_1790697391065.png"
    ],
    variants: [
      { id: "v1", image: "/balenciaga_speed_sneaker_1790697391065.png", thumbnail: "/balenciaga_speed_sneaker_1790697391065.png" },
      { id: "v2", image: "/balenciaga_speed_sneaker_1790697391065.png", thumbnail: "/balenciaga_speed_sneaker_1790697391065.png" }
    ],
    sizes: [39, 40, 41, 42, 43],
    composition: [
      { name: "POLYAMIDE", value: 100 },
      { name: "RUBBER", value: 100 },
      { name: "SYNTHETIC", value: 90 }
    ],
    description: "We understand that some sneakers are greater than others and only worn once in a blue moon. So for those extra special occasions why not try this collaborative effort from Gyakusou and Nike with these...",
    statusColor: "bg-orange-500",
  },
  {
    id: "p2",
    brand: "Tom Ford",
    title: "Yago",
    price: 80000,
    images: [
      "/tomford_uptempo_sneaker_1790697424658.png",
      "/tomford_uptempo_sneaker_1790697424658.png",
      "/tomford_uptempo_sneaker_1790697424658.png"
    ],
    variants: [
      { id: "v1", image: "/tomford_uptempo_sneaker_1790697424658.png", thumbnail: "/tomford_uptempo_sneaker_1790697424658.png" },
      { id: "v2", image: "/tomford_uptempo_sneaker_1790697424658.png", thumbnail: "/tomford_uptempo_sneaker_1790697424658.png" }
    ],
    sizes: [40, 41, 42, 43, 44],
    composition: [
      { name: "LEATHER", value: 100 },
      { name: "RUBBER", value: 100 },
      { name: "SYNTHETIC", value: 80 }
    ],
    description: "Bold styling meets premium materials. These sneakers command attention with their oversized graphics and superior comfort profile.",
    statusColor: "bg-neutral-800",
  },
  {
    id: "p3",
    brand: "Neil Barrett",
    title: "Geometric Styled 003",
    price: 24500,
    images: [
      "/neilbarrett_geo_sneaker_1790697492879.png",
      "/neilbarrett_geo_sneaker_1790697492879.png",
      "/neilbarrett_geo_sneaker_1790697492879.png"
    ],
    variants: [
      { id: "v1", image: "/neilbarrett_geo_sneaker_1790697492879.png", thumbnail: "/neilbarrett_geo_sneaker_1790697492879.png" },
      { id: "v2", image: "/neilbarrett_geo_sneaker_1790697492879.png", thumbnail: "/neilbarrett_geo_sneaker_1790697492879.png" }
    ],
    sizes: [38, 39, 40, 41, 42],
    composition: [
      { name: "MESH", value: 90 },
      { name: "RUBBER", value: 100 },
      { name: "SYNTHETIC", value: 95 }
    ],
    description: "Futuristic lines and a complex multi-textured upper define the Geometric Styled 003. Lightweight breathability combined with structural rigidity.",
    statusColor: "bg-neutral-800",
  },
  {
    id: "p4",
    brand: "Emporio Armani",
    title: "Massive Geometric",
    price: 9000,
    images: [
      "/armani_massive_sneaker_1790697511077.png",
      "/armani_massive_sneaker_1790697511077.png",
      "/armani_massive_sneaker_1790697511077.png"
    ],
    variants: [
      { id: "v1", image: "/armani_massive_sneaker_1790697511077.png", thumbnail: "/armani_massive_sneaker_1790697511077.png" },
      { id: "v2", image: "/armani_massive_sneaker_1790697511077.png", thumbnail: "/armani_massive_sneaker_1790697511077.png" }
    ],
    sizes: [41, 42, 43, 44, 45],
    composition: [
      { name: "SUEDE", value: 100 },
      { name: "RUBBER", value: 100 },
      { name: "TEXTILE", value: 85 }
    ],
    description: "An earthy, rugged take on the chunky sneaker trend. Durable suede overlays interlocked with breathable mesh for everyday exploration.",
    statusColor: "bg-[#7c8363]",
  }
];
