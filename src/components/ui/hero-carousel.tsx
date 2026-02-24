'use client'

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Import images directly from the folder
import img1 from "./icons integraçoes hero/WhatsApp_Image_2026-02-24_at_01.28.07-removebg-preview.png";
import img2 from "./icons integraçoes hero/WhatsApp_Image_2026-02-24_at_01.28.32-removebg-preview.png";
import img3 from "./icons integraçoes hero/WhatsApp_Image_2026-02-24_at_01.28.07-removebg-preview (1).png";

const images = [img1, img2, img3];

/**
 * HeroCarousel - A high-performance, full-width carousel for the Home page.
 * Features: Auto-play, smooth fade transitions, responsive design, and pixel-perfect branding.
 */
export function HeroCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    }, []);

    const prevSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }, []);

    // Auto-play logic
    useEffect(() => {
        if (isHovered) return;

        const intervalId = setInterval(nextSlide, 5000);
        return () => clearInterval(intervalId);
    }, [nextSlide, isHovered]);

    return (
        <section
            className="relative w-full h-[50vh] md:h-[70vh] overflow-hidden bg-[#0B0D11]"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Slides Container */}
            <div className="relative w-full h-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                        className="absolute inset-0 w-full h-full"
                        style={{ willChange: "opacity" }}
                    >
                        {/* Background Layer - Blurred for atmosphere */}
                        <div className="absolute inset-0 z-0 overflow-hidden">
                            <img
                                src={images[currentIndex]}
                                className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-20 scale-125 select-none"
                                alt=""
                            />
                        </div>

                        {/* Main Image Layer */}
                        <div className="relative z-10 w-full h-full flex items-center justify-center p-12 md:p-24">
                            <div className="relative w-[70%] h-[50%]">
                                <img
                                    src={images[currentIndex]}
                                    alt={`Slide ${currentIndex + 1}`}
                                    className="w-full h-full object-contain select-none drop-shadow-[0_0_50px_rgba(255,255,255,0.05)]"
                                />
                            </div>
                        </div>


                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Arrows - Desktop/Tablet only */}
            <div className="hidden sm:block">
                <button
                    onClick={prevSlide}
                    className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 p-2 md:p-3 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-white hover:bg-white/20 transition-all z-20"
                    aria-label="Anterior"
                >
                    <ChevronLeft className="size-6 md:size-8" />
                </button>
                <button
                    onClick={nextSlide}
                    className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 p-2 md:p-3 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-white hover:bg-white/20 transition-all z-20"
                    aria-label="Próximo"
                >
                    <ChevronRight className="size-6 md:size-8" />
                </button>
            </div>

            {/* Dots Indicator - All devices */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-20">
                {images.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={cn(
                            "size-2.5 md:size-3 rounded-full transition-all duration-300",
                            currentIndex === index
                                ? "bg-primary scale-125 shadow-[0_0_10px_hsl(var(--primary))]"
                                : "bg-white/30 hover:bg-white/50"
                        )}
                        aria-label={`Ir para slide ${index + 1}`}
                    />
                ))}
            </div>
        </section>
    );
}
