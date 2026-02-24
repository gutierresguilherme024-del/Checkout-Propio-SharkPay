import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SlideData {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    bgClass: string;
}

const UtmifyIcon = ({ active }: { active: boolean }) => (
    <div className="relative size-32 md:size-40 flex items-center justify-center bg-[#0B0D11] rounded-[28px] overflow-hidden shadow-2xl">
        <svg viewBox="0 0 100 100" className="size-24 md:size-28">
            {/* Main U shape */}
            <path
                d="M25 25H35V65C35 70.5 39.5 75 45 75H55C60.5 75 65 70.5 65 65V45H75V65C75 76 66 85 55 85H45C34 85 25 76 25 65V25Z"
                fill="white"
            />
            <path
                d="M45 25H75V60C75 68.3 68.3 75 60 75H45V65H60C62.8 65 65 62.8 65 60V35H45V25Z"
                fill="white"
            />
            {/* Gradient Accent Pulse */}
            <path
                d="M65 25H75V35L65 25Z"
                className={cn(active && "animate-utmify-pulse")}
                fill="url(#utmify-grad)"
            />
            <defs>
                <linearGradient id="utmify-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00C2FF" />
                    <stop offset="100%" stopColor="#0047FF" />
                </linearGradient>
            </defs>
        </svg>
    </div>
);

const PushinPayIcon = ({ active }: { active: boolean }) => (
    <div className="relative size-32 md:size-40 flex items-center justify-center bg-[#0B0D11] rounded-[30px] overflow-hidden shadow-2xl">
        <svg viewBox="0 0 100 100" className="size-24 md:size-28">
            <path
                d="M30 20C30 20 45 20 60 20C75 20 85 32 85 45C85 58 75 70 60 70H30V20Z"
                stroke="#5D5FEF"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
                className={cn(active && "animate-pushin-draw")}
            />
            <path
                d="M30 45H50C60 45 65 52 65 60C65 68 60 75 50 75H30V45Z"
                stroke="#5D5FEF"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
                className={cn(active && "animate-pushin-draw")}
                style={{ animationDelay: "0.5s" }}
            />
        </svg>
    </div>
);

const StripeIcon = () => (
    <div className="relative size-32 md:size-40 flex items-center justify-center bg-[#635BFF] rounded-[28px] overflow-hidden shadow-2xl">
        <svg viewBox="0 0 40 40" className="size-24 md:size-28">
            <path
                d="M15.4 16.5C15.4 14.6 17 13.5 19.8 13.5C21.3 13.5 22.8 13.8 24.1 14.4V11.2C22.8 10.7 21.4 10.4 19.8 10.4C15.5 10.4 11.8 12.6 11.8 16.7C11.8 23.1 20.3 22 20.3 25.4C20.3 26.8 19 27.6 17.2 27.6C15.5 27.6 13.7 26.8 12.2 26V29.4C13.8 30.1 15.6 30.5 17.2 30.5C21.7 30.5 25.5 28.5 25.5 24.2C25.5 17.7 15.4 18.9 15.4 16.5Z"
                fill="white"
            />
        </svg>
    </div>
);

export function IntegrationCarousel() {
    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: true,
        duration: 30,
    });
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);

    const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
    const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
        setCanScrollPrev(emblaApi.canScrollPrev());
        setCanScrollNext(emblaApi.canScrollNext());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        onSelect();
        emblaApi.on("select", onSelect);
        emblaApi.on("reInit", onSelect);
    }, [emblaApi, onSelect]);

    // Autoplay functionality
    useEffect(() => {
        if (!emblaApi) return;
        const intervalId = setInterval(() => {
            emblaApi.scrollNext();
        }, 4000); // 4 seconds interval

        return () => clearInterval(intervalId);
    }, [emblaApi]);

    const slides: SlideData[] = [
        {
            id: "utmify",
            title: "Integração Utmify",
            description: "Rastreamento inteligente de campanhas e conversões.",
            icon: <UtmifyIcon active={selectedIndex === 0} />,
            bgClass: "bg-[#0B0D11]",
        },
        {
            id: "pushinpay",
            title: "Integração Pushin Pay",
            description: "Processamento de pagamentos fluido e seguro.",
            icon: <PushinPayIcon active={selectedIndex === 1} />,
            bgClass: "bg-[#0B0D11]",
        },
        {
            id: "stripe",
            title: "Integração Stripe",
            description: "Infraestrutura global de pagamentos para internet.",
            icon: <StripeIcon />,
            bgClass: "bg-[#635BFF]",
        },
    ];

    return (
        <div className="relative w-full max-w-4xl mx-auto px-4 py-12 group">
            {/* Carousel Container */}
            <div className="overflow-hidden rounded-3xl" ref={emblaRef}>
                <div className="flex">
                    {slides.map((slide, index) => (
                        <div
                            key={slide.id}
                            className="relative flex-[0_0_100%] min-w-0"
                        >
                            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 p-8 md:p-12">
                                {/* Icon Column */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{
                                        opacity: selectedIndex === index ? 1 : 0,
                                        scale: selectedIndex === index ? 1 : 0.9,
                                        y: selectedIndex === index ? 0 : 20
                                    }}
                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                    className="flex-shrink-0"
                                >
                                    {slide.icon}
                                </motion.div>

                                {/* Text Column */}
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{
                                        opacity: selectedIndex === index ? 1 : 0,
                                        x: selectedIndex === index ? 0 : 20
                                    }}
                                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                                    className="text-center md:text-left space-y-4 max-w-sm"
                                >
                                    <h3 className="text-2xl md:text-4xl font-brand tracking-tight text-foreground">
                                        {slide.title}
                                    </h3>
                                    <p className="text-base md:text-xl text-foreground/60 leading-relaxed font-sans">
                                        {slide.description}
                                    </p>
                                </motion.div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation Arrows */}
            <button
                onClick={scrollPrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 p-3 rounded-full bg-background/50 border border-border backdrop-blur-md text-foreground/50 hover:text-primary hover:border-primary transition-all opacity-0 group-hover:opacity-100 hidden sm:flex"
                aria-label="Previous slide"
            >
                <ChevronLeft className="size-6" />
            </button>
            <button
                onClick={scrollNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 p-3 rounded-full bg-background/50 border border-border backdrop-blur-md text-foreground/50 hover:text-primary hover:border-primary transition-all opacity-0 group-hover:opacity-100 hidden sm:flex"
                aria-label="Next slide"
            >
                <ChevronRight className="size-6" />
            </button>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-3 mt-8">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => scrollTo(index)}
                        className={cn(
                            "size-2.5 rounded-full transition-all duration-300",
                            selectedIndex === index
                                ? "bg-primary w-8"
                                : "bg-foreground/20 hover:bg-foreground/40"
                        )}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
