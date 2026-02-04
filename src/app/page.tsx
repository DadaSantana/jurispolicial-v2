'use client'
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSlider from '@/components/HeroSlider';
import PricingPlans from '@/components/PricingPlans';
import LatestPosts from '@/components/LatestPosts';
import ExclusiveContent from '@/components/ExclusiveContent';
import CoursesSection from '@/components/CoursesSection';

const Page = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-grow">
        <HeroSlider />
        <LatestPosts />
        <CoursesSection />
        <ExclusiveContent />
        <PricingPlans />
      </main>
      <Footer />
    </div>
  );
};

export default Page;
