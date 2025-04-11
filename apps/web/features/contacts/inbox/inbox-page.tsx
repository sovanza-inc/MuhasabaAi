'use client'

import * as React from 'react'
import {
  Box,
  Flex,
  Text,
  Avatar,
  Button,
  IconButton,
  Input,
  useColorModeValue,
  VStack,
  HStack,
  Divider,
  useToast,
  Spinner,
} from '@chakra-ui/react'
import { FiMessageSquare, FiBox, FiMoreVertical, FiSearch, FiX } from 'react-icons/fi'
import { api } from '#lib/trpc/react'
import { v4 as uuidv4 } from 'uuid'
import { useParams } from 'next/navigation'


// Chat message component
interface ChatMessageProps {
  content: string
  timestamp: string
  isOutgoing: boolean
}

const ChatMessage: React.FC<ChatMessageProps> = ({ content, timestamp, isOutgoing }) => {
  const messageBg = useColorModeValue('gray.100', 'gray.700');
  
  return (
    <Flex 
      justify={isOutgoing ? "flex-end" : "flex-start"} 
      mb={4}
      mx={4}
    >
      <Box
        maxW="70%"
        bg={isOutgoing ? "blue.500" : messageBg}
        color={isOutgoing ? "white" : undefined}
        p={4}
        borderRadius="lg"
        boxShadow="sm"
      >
        <Text>{content}</Text>
        <Text 
          fontSize="xs" 
          color={isOutgoing ? "whiteAlpha.800" : "gray.500"} 
          mt={1}
        >
          {timestamp}
        </Text>
      </Box>
    </Flex>
  );
};

// Chat list item component
interface ChatListItemProps {
  name: string
  lastMessage: string
  time: string
  avatar?: string
  unreadCount?: number
  isOnline?: boolean
  isSelected?: boolean
  onClick: () => void
}

const ChatListItem: React.FC<ChatListItemProps> = ({
  name,
  lastMessage,
  time,
  avatar,
  unreadCount,
  isOnline,
  isSelected,
  onClick,
}) => {
  const bg = useColorModeValue('white', 'gray.800')
  const selectedBg = useColorModeValue('gray.100', 'gray.700')
  const itemBorderColor = useColorModeValue('gray.100', 'gray.700')
  const avatarBorderColor = useColorModeValue('white', 'gray.800')

  return (
    <Flex
      p={3}
      cursor="pointer"
      bg={isSelected ? selectedBg : bg}
      _hover={{ bg: selectedBg }}
      onClick={onClick}
      borderBottom="1px"
      borderColor={itemBorderColor}
    >
      <Box position="relative">
        <Avatar name={name} src={avatar} size="md" />
        {isOnline && (
          <Box
            position="absolute"
            bottom="0"
            right="0"
            w="3"
            h="3"
            bg="green.500"
            borderRadius="full"
            border="2px"
            borderColor={avatarBorderColor}
          />
        )}
      </Box>
      <Box ml={3} flex={1}>
        <Flex justify="space-between" align="center">
          <Text fontWeight="bold">{name}</Text>
          <Text fontSize="xs" color="gray.500">
            {time}
          </Text>
        </Flex>
        <Flex justify="space-between" align="center">
          <Text fontSize="sm" color="gray.500" noOfLines={1}>
            {lastMessage}
          </Text>
          {unreadCount && (
            <Box
              bg="blue.500"
              color="white"
              borderRadius="full"
              px={2}
              py={0.5}
              fontSize="xs"
              fontWeight="bold"
            >
              {unreadCount}
            </Box>
          )}
        </Flex>
      </Box>
    </Flex>
  )
}

interface InboxListPageProps {
  params: { 
    workspace: string 
  }
  searchParams?: { [key: string]: string | string[] | undefined }
  data?: any
}

export const InboxListPage: React.FC<InboxListPageProps> = ({ params }) => {
  // Use hooks at the top level
  const routeParams = useParams()
  const workspaceId = params.workspace ?? routeParams?.workspace as string

  // Add validation for workspaceId
  React.useEffect(() => {
    if (!workspaceId) {
      console.error('No workspace ID found')
    }
  }, [workspaceId])

  // Initialize state hooks
  const [selectedChat, setSelectedChat] = React.useState<string | null>(null)
  const [messageInput, setMessageInput] = React.useState('')
  const [conversationId] = React.useState<string>(uuidv4())
  const [isAILoading, setIsAILoading] = React.useState(false)
  const [isWelcomeLoading, setIsWelcomeLoading] = React.useState(true)
  const [isMobileView, setIsMobileView] = React.useState(false)

  // Check for mobile view on mount and window resize
  React.useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth >= 321 && window.innerWidth <= 768);
    };

    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  // Handle closing chat on mobile
  const handleCloseChat = () => {
    setSelectedChat(null);
  };

  // Fetch user session first
  const { data: sessionData } = api.auth.me.useQuery(undefined, {
    retry: 1,
    placeholderData: null
  });

  // Wrap session initialization in useMemo
  const session = React.useMemo(() => 
    sessionData ? { user: sessionData } : null
  , [sessionData]);

  // Log user information for debugging
  React.useEffect(() => {
    console.log('Session:', session)
  }, [session])

  // Ref hook
  const chatContainerRef = React.useRef<HTMLDivElement>(null)

  // TRPC hooks with better error handling
  const { data: chatHistory, refetch: refetchChat, isLoading: isChatLoading } = api.chat.getConversation.useQuery(
    { 
      workspaceId: workspaceId ?? '',
      conversationId: conversationId,
    }, 
    { 
      enabled: selectedChat === 'ai' && !!workspaceId,
    }
  );

  const sendMessageMutation = api.chat.sendMessage.useMutation({
    onSuccess: async () => {
      setMessageInput('');
      await refetchChat();
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  });

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!messageInput.trim() || selectedChat !== 'ai' || !workspaceId) return;

    if (!session) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to send messages.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsAILoading(true);
    
    try {
      const response = await sendMessageMutation.mutateAsync({
        workspaceId,
        conversationId,
        message: messageInput.trim(),
      });
      
      if (response?.success) {
        setMessageInput('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error Sending Message',
        description: 'Failed to send message. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsAILoading(false);
    }
  };

  // Handle initial welcome message and loading state
  React.useEffect(() => {
    if (chatHistory && chatHistory.length === 0 && workspaceId) {
      const mutation = api.chat.sendMessage.useMutation({
        onSuccess: async (response: any) => {
          await refetchChat();
          console.log('Welcome message sent successfully:', response);
        },
        onError: (error: any) => {
          console.error('Failed to send welcome message:', error);
        }
      });

      mutation.mutate({
        workspaceId,
        conversationId,
        message: "Hello! How can I help you today?",
      });
    }
    setIsWelcomeLoading(false);
  }, [chatHistory, workspaceId, conversationId, refetchChat]);

  const toast = useToast();

  // Initialize chat when selecting AI Assistant
  React.useEffect(() => {
    if (selectedChat === 'ai' && workspaceId) {
      refetchChat();
    }
  }, [selectedChat, workspaceId, refetchChat]);

  // Utility function to format dates like WhatsApp
  const formatChatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  // Utility function to format times
  const formatChatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Message type definitions
  interface MessageGroup {
    date: string;
    messages: Message[];
  }

  type Message = {
    content: string;
    timestamp: string;
    timeGroup: string;
    isOutgoing: boolean;
    originalDate: Date;
    isWelcomeMessage?: boolean;
    isTimeSeparator?: boolean;
  };

  // Move useColorModeValue hooks to the top level
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const chatListBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const searchBg = useColorModeValue('gray.100', 'gray.700');
  const chatAreaBg = useColorModeValue('gray.100', 'gray.900');
  const messageInputBg = useColorModeValue('gray.100', 'gray.700');

  // Transform chat history into message format with proper typing
  const aiMessages = React.useMemo(() => {
    if (!chatHistory || chatHistory.length === 0) return []
    
    // Sort messages by creation time to ensure correct order
    const sortedMessages = [...chatHistory].sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return aTime - bTime;
    });

    // Group messages by date
    const groupedMessages: {
      date: string;
      messages: Message[];
    }[] = [];

    sortedMessages.forEach((msg) => {
      if (!msg.timestamp) return;
      
      const msgDate = new Date(msg.timestamp);
      const formattedDate = formatChatDate(msgDate);
      const formattedTime = formatChatTime(msgDate);
      
      // Determine time group (every 2 hours)
      const timeGroup = `${Math.floor(msgDate.getHours() / 2) * 2}-${Math.floor(msgDate.getHours() / 2) * 2 + 1}`;
      
      // Find or create date group
      let dateGroup = groupedMessages.find(group => group.date === formattedDate);
      if (!dateGroup) {
        dateGroup = { date: formattedDate, messages: [] };
        groupedMessages.push(dateGroup);
      }

      // Check if it's a welcome message
      const isWelcomeMessage = msg.message === "Hello! How can I help you today?" || 
        msg.message.toLowerCase().includes('welcome');

      // Add message to group
      dateGroup.messages.push({
        content: msg.message,
        timestamp: formattedTime,
        timeGroup,
        isOutgoing: msg.role === 'user',
        originalDate: msgDate,
        isWelcomeMessage
      });
    });

    // Group messages within each date by time
    groupedMessages.forEach(dateGroup => {
      const timeGroupedMessages: Message[] = [];
      let currentTimeGroup = '';

      dateGroup.messages.forEach((msg) => {
        // Add time separator if time group changes or it's a welcome message
        if (msg.timeGroup !== currentTimeGroup || msg.isWelcomeMessage) {
          currentTimeGroup = msg.timeGroup;
          
          // Add time separator message
          timeGroupedMessages.push({
            content: msg.timestamp,
            timestamp: '',
            timeGroup: currentTimeGroup,
            isOutgoing: false,
            originalDate: msg.originalDate,
            isTimeSeparator: true
          });
        }

        // Add the actual message
        timeGroupedMessages.push(msg);
      });

      // Replace original messages with time-grouped messages
      dateGroup.messages = timeGroupedMessages;
    });

    return groupedMessages;
  }, [chatHistory]);

  // Date Separator Component
  const DateSeparator = ({ date }: { date: string }) => (
    <Flex 
      align="center" 
      my={4} 
      mx={2}
    >
      <Divider flex={1} borderColor={useColorModeValue('gray.300', 'gray.600')} />
      <Text 
        px={3} 
        fontSize="sm" 
        color={useColorModeValue('gray.500', 'gray.400')} 
        bg={useColorModeValue('gray.50', 'gray.800')}
        borderRadius="full"
      >
        {date}
      </Text>
      <Divider flex={1} borderColor={useColorModeValue('gray.300', 'gray.600')} />
    </Flex>
  );

  // Time Separator Component
  const TimeSeparator = ({ time }: { time: string }) => (
    <Flex 
      align="center" 
      my={2} 
      mx={2}
      justifyContent="center"
    >
      <Text 
        px={3} 
        fontSize="xs" 
        color={useColorModeValue('gray.500', 'gray.400')} 
        bg={useColorModeValue('gray.100', 'gray.700')}
        borderRadius="full"
      >
        {time}
      </Text>
    </Flex>
  );

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [aiMessages]);

  // Reset welcome loading when chat loads
  React.useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      setIsWelcomeLoading(false);
    }
  }, [chatHistory])

  // Dummy messages for other chats
  const dummyMessages = [
    { content: "Let me check that for you", timestamp: "10:00 AM", isOutgoing: false },
    { content: "Thanks!", timestamp: "10:01 AM", isOutgoing: true },
  ]

  // Get messages based on selected chat
  const currentMessages: MessageGroup[] = selectedChat === 'ai' ? aiMessages : [
    { 
      date: 'Today',
      messages: dummyMessages.map(msg => ({
        content: msg.content,
        timestamp: msg.timestamp,
        timeGroup: '0-1',
        isOutgoing: msg.isOutgoing,
        originalDate: new Date(),
      }))
    }
  ];

  // Add null check for rendering
  if (!workspaceId) {
    return (
      <Flex justify="center" align="center" h="100vh">
        <Text>Workspace not found</Text>
      </Flex>
    )
  }

  return (
    <Flex h="100vh" bg={bgColor} overflow="hidden">
      {/* Left sidebar with chat list */}
      <Box 
        w={{ base: "100%", md: "350px" }}
        bg={chatListBg} 
        borderRight="1px" 
        borderColor={borderColor}
        display={{ 
          base: selectedChat && isMobileView ? "none" : "block", 
          md: "block" 
        }}
      >
        {/* Header */}
        <Flex 
          p={4} 
          justify="space-between" 
          align="center" 
          borderBottom="1px" 
          borderColor={borderColor}
          gap={2}
        >
          <Box pl={{ base: 8, sm: 6, md: 5, lg: 2 }} flex="1">
            <Text 
              fontSize={{ base: "lg", md: "xl" }} 
              fontWeight="bold"
              isTruncated
            >
              Chats
            </Text>
          </Box>
          <HStack spacing={{ base: 2, md: 2 }} flexShrink={0} mr={{ base: 2, md: 1 }}>
            <IconButton
              aria-label="Talk to AI"
              icon={<FiBox />}
              variant="ghost"
              colorScheme="blue"
              onClick={() => setSelectedChat('ai')}
              size={{ base: "sm", md: "md" }}
              minW={{ base: "32px", md: "40px" }}
            />
            <IconButton
              aria-label="More options"
              icon={<FiMoreVertical />}
              variant="ghost"
              size={{ base: "sm", md: "md" }}
              minW={{ base: "32px", md: "40px" }}
            />
          </HStack>
        </Flex>

        {/* Search bar */}
        <Box p={4}>
          <Flex
            as="form"
            align="center"
            bg={searchBg}
            rounded="full"
            px={4}
            py={2}
          >
            <FiSearch />
            <Input
              placeholder="Search chats..."
              border="none"
              _focus={{ border: 'none' }}
              ml={2}
              variant="unstyled"
            />
          </Flex>
        </Box>

        {/* Chat list */}
        <VStack spacing={0} align="stretch" overflowY="auto" maxH="calc(100vh - 140px)">
          <ChatListItem
            name="AI Assistant"
            lastMessage="How can I help you today?"
            time="Now"
            avatar="/ai-avatar.png"
            isOnline={true}
            isSelected={selectedChat === 'ai'}
            onClick={() => setSelectedChat('ai')}
          />
        </VStack>
      </Box>

      {/* Right side chat area */}
      <Box 
        flex="1" 
        bg={chatAreaBg}
        display={{ 
          base: !selectedChat && isMobileView ? "none" : "block", 
          md: "block" 
        }}
        h="100vh"
        position="relative"
      >
        {selectedChat ? (
          <Flex direction="column" h="100%">
            {/* Chat header */}
            <Flex
              p={4}
              bg={chatListBg}
              borderBottom="1px"
              borderColor={borderColor}
              align="center"
            >
              <Avatar name={selectedChat} size="sm" />
              <Box ml={3} flex="1">
                <Text fontWeight="bold">
                  {selectedChat === 'ai' ? 'AI Assistant' : selectedChat}
                </Text>
                <Text fontSize="xs" color="green.500">
                  {selectedChat !== 'ai' && 'Online'}
                </Text>
              </Box>
              {isMobileView && (
                <IconButton
                  aria-label="Close chat"
                  icon={<FiX />}
                  variant="ghost"
                  onClick={handleCloseChat}
                />
              )}
              <IconButton
                ml={2}
                aria-label="More options"
                icon={<FiMoreVertical />}
                variant="ghost"
              />
            </Flex>

            {/* Chat messages area */}
            <Flex
              ref={chatContainerRef}
              flex={1}
              direction="column"
              p={6}
              overflowY="auto"
              position="relative"
            >
              {/* Welcome message loader */}
              {(isWelcomeLoading || isChatLoading) && (
                <Flex justify="center" align="center" p={4} width="full">
                  <Spinner 
                    thickness="4px"
                    speed="0.65s"
                    emptyColor="gray.200"
                    color="blue.500"
                    size="xl"
                  />
                </Flex>
              )}

              {/* Only show messages when not loading */}
              {!isWelcomeLoading && !isChatLoading && (
                <>
                  {currentMessages.map((dateGroup: MessageGroup, groupIndex: number) => (
                    <React.Fragment key={groupIndex}>
                      {/* Date Separator */}
                      <DateSeparator date={dateGroup.date} />
                      
                      {/* Messages for this date */}
                      {dateGroup.messages.map((msg: Message, msgIndex: number) => (
                        msg.isTimeSeparator ? (
                          <TimeSeparator key={`time-${groupIndex}-${msgIndex}`} time={msg.content} />
                        ) : (
                          <ChatMessage 
                            key={`msg-${groupIndex}-${msgIndex}`} 
                            content={msg.content}
                            timestamp={msg.timestamp}
                            isOutgoing={msg.isOutgoing}
                          />
                        )
                      ))}
                    </React.Fragment>
                  ))}

                  {/* AI response loader */}
                  {isAILoading && (
                    <Flex justify="center" align="center" p={4}>
                      <Spinner 
                        thickness="4px"
                        speed="0.65s"
                        emptyColor="gray.200"
                        color="blue.500"
                        size="xl"
                      />
                    </Flex>
                  )}
                </>
              )}
            </Flex>

            {/* Message input */}
            <Flex
              p={4}
              bg={chatListBg}
              borderTop="1px"
              borderColor={borderColor}
              align="center"
            >
              <Input
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                bg={messageInputBg}
                borderRadius="full"
              />
              <Button
                ml={2}
                colorScheme="blue"
                borderRadius="full"
                px={6}
                isDisabled={!messageInput.trim() || !selectedChat}
                onClick={handleSendMessage}
                isLoading={sendMessageMutation.isPending}
              >
                Send
              </Button>
            </Flex>
          </Flex>
        ) : (
          <Flex
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            align="center"
            justify="center"
            direction="column"
            color="gray.500"
            bg={chatAreaBg}
          >
            <FiMessageSquare size={48} />
            <Text mt={4}>Select a chat to start messaging</Text>
          </Flex>
        )}
      </Box>
    </Flex>
  )
}

// Add default export
export default InboxListPage
