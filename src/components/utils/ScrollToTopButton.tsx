import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Tooltip } from "../ui/tooltip";
import { TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronUp as ToTopIcon } from "lucide-react";

const ScrollToTopButton = () => {
  const [ isVisible, setIsVisible ] = useState( false );

  // Show button when page is scrolled down
  useEffect( () => {
    const toggleVisibility = () => {
      const offset =
        document.documentElement.scrollTop || document.body.scrollTop;
      // if (window.pageYOffset > 300) {
      if ( offset > 300 ) {
        setIsVisible( true );
      } else {
        setIsVisible( false );
      }
    };

    window.addEventListener( "scroll", toggleVisibility );

    return () => window.removeEventListener( "scroll", toggleVisibility );
  }, [] );

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo( {
      top: 0,
      behavior: "smooth",
    } );
  };

  return (
    isVisible && (
      <Button
        type="button"
        variant="secondary"
        onClick={scrollToTop}
        className="fixed right-0 bottom-0 mx-4 my-16"
        title="Scroll to top"
      >
        <ToTopIcon size={24} />
      </Button>
    )
  );
};

export default ScrollToTopButton;
