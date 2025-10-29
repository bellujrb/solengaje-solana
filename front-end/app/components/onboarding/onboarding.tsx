"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "../../../components/button"
import Icon from "../../../components/icon"

type OnboardingPageProps = {
  setActiveTab?: (tab: string) => void;
}

const onboardingData = [
  {
    title: "Connect & Create",
    description:
      "Login with your social accounts and connect the networks you use. Create campaigns for your brand in minutes.",
    image: "/campaign.jpg",
    bgColor: "bg-purple-300",
  },
  {
    title: "Define Your Campaign",
    description:
      "Set hashtags, engagement KPIs, payment amounts, and campaign periods. Upload contracts and track everything in one place.",
    image: "/social-network.jpg",
    bgColor: "bg-slate-900",
  },
  {
    title: "Smart Escrow Payments",
    description:
      "Funds are held in secure escrow and released automatically as goals are met. Choose stablecoins for payments.",
    image: "/hero.png",
    bgColor: "bg-purple-400",
  },
  {
    title: "Real-Time Tracking",
    description:
      "Our oracle collects metrics in real-time from social APIs. Get micropayments automatically every 5% of your goal achieved.",
    image: "/influencer.jpg",
    bgColor: "bg-indigo-900",
  },
]

export default function OnboardingPage({ setActiveTab }: OnboardingPageProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < onboardingData.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Navigate to dashboard
      if (setActiveTab) {
        setActiveTab("dashboard")
      }
    }
  }

  const handleSkip = () => {
    // Navigate to dashboard
    if (setActiveTab) {
      setActiveTab("dashboard")
    }
  }

  const currentData = onboardingData[currentStep]

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-8rem)] justify-between py-6">
      {/* Top Section - Image */}
      <div className="flex-shrink-0 mb-6">
        <div className={`${currentData.bgColor} relative h-[350px] rounded-2xl overflow-hidden shadow-lg`}>
          <Image
            src={currentData.image || "/placeholder.svg"}
            alt={currentData.title}
            width={400}
            height={350}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Middle Section - Content */}
      <div className="flex-grow flex flex-col justify-center px-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">{currentData.title}</h2>
        <p className="text-gray-600 text-center leading-relaxed mb-8 text-base">{currentData.description}</p>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {onboardingData.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStep ? "w-8 bg-gray-900" : "w-2 bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Section - Navigation Buttons */}
      <div className="flex-shrink-0 flex items-center justify-between px-4">
        <Button
          variant="ghost"
          onClick={handleSkip}
          className="text-red-500 hover:text-red-600 hover:bg-transparent font-semibold"
        >
          Skip
        </Button>
        <Button
          variant="ghost"
          onClick={handleNext}
          className="text-indigo-600 hover:text-indigo-700 hover:bg-transparent font-semibold"
        >
          <span className="flex items-center gap-1">
            Next
            <Icon name="chevron-right" size="sm" className="w-4 h-4" />
          </span>
        </Button>
      </div>
    </div>
  )
}

